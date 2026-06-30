from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import configparser
import os

app = Flask(__name__)
CORS(app)

# ─── КОНФИГ ──────────────────────────────────────────────
_cfg = configparser.ConfigParser()
_cfg.read(os.path.join(os.path.dirname(__file__), 'config.ini'), encoding='utf-8')

ZNUNY_URL      = _cfg['znuny']['url']
ZNUNY_USER     = _cfg['znuny']['user']
ZNUNY_PASS     = _cfg['znuny']['password']
TELEGRAM_TOKEN = _cfg['telegram']['token']


def _int_or_none(val):
    val = val.strip()
    return int(val) if val else None


def _load_seniors():
    seniors = []
    for section in _cfg.sections():
        if not section.startswith('senior.'):
            continue
        s = _cfg[section]
        subs = []
        i = 1
        while s.get(f'sub.{i}.name'):
            subs.append({
                'name':    s[f'sub.{i}.name'],
                'chat_id': _int_or_none(s.get(f'sub.{i}.chat', '')),
            })
            i += 1
        seniors.append({
            'name':         s['name'],
            'owner_id':     int(s['owner_id']),
            'chat_id':      _int_or_none(s.get('chat_id', '')),
            'subordinates': subs,
        })
    return seniors


SENIORS = _load_seniors()
# ─────────────────────────────────────────────────────────


def get_session():
    r = requests.post(f"{ZNUNY_URL}/Session", json={
        "UserLogin": ZNUNY_USER,
        "Password": ZNUNY_PASS
    })
    return r.json().get("SessionID")


def get_tickets(session_id):
    r = requests.post(f"{ZNUNY_URL}/Ticket/Search?SessionID={session_id}", json={
        "Queue": "NU EngineeringDesk",
        "States": ["open"]
    })
    return r.json().get("TicketID", [])


def get_ticket_detail(session_id, ticket_id):
    r = requests.get(f"{ZNUNY_URL}/Ticket/{ticket_id}?SessionID={session_id}&AllArticles=1&Extended=1")
    data = r.json()
    tickets = data.get("Ticket", [])
    return tickets[0] if tickets else None


def extract_phone(articles):
    if not articles:
        return ""
    body = articles[0].get("Body", "")
    for line in body.split("\n"):
        line = line.strip()
        if "+7" in line or "8 (" in line:
            return line
    return ""


def send_telegram(chat_id, text):
    r = requests.post(
        f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
        json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    )
    return r.json()


@app.route("/tickets")
def tickets():
    try:
        session_id = get_session()
        ticket_ids = get_tickets(session_id)

        result = []
        for tid in ticket_ids[:50]:
            detail = get_ticket_detail(session_id, tid)
            if detail:
                result.append({
                    "ticket_id":     detail.get("TicketID"),
                    "ticket_number": detail.get("TicketNumber"),
                    "title":         detail.get("Title"),
                    "service":       detail.get("Service"),
                    "customer":      detail.get("CustomerUserID"),
                    "owner":         detail.get("Owner"),
                    "owner_id":      detail.get("OwnerID"),
                    "state":         detail.get("State"),
                    "created":       detail.get("Created"),
                    "phone":         extract_phone(detail.get("Article", [])),
                })

        return jsonify({"tickets": result, "total": len(ticket_ids)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/send", methods=["POST"])
def send():
    try:
        data = request.json
        ticket = data.get("ticket")
        engineer_name = data.get("engineer_name")
        chat_id = data.get("chat_id")

        if not chat_id:
            return jsonify({"error": f"Telegram не настроен для {engineer_name}"}), 400

        text = (
            f"📋 <b>Заявка #{ticket.get('ticket_number')}</b>\n\n"
            f"<b>Тема:</b> {ticket.get('title')}\n"
            f"<b>Услуга:</b> {ticket.get('service') or '—'}\n"
            f"<b>Заявитель:</b> {ticket.get('customer') or '—'}\n"
            f"<b>Телефон:</b> {ticket.get('phone') or 'не указан'}\n"
            f"<b>Дата:</b> {ticket.get('created') or '—'}\n\n"
            f"🔗 <a href='https://support.nu.edu.kz/znuny/index.pl?Action=AgentTicketZoom;TicketID={ticket.get('ticket_id')}'>Открыть в Znuny</a>"
        )

        result = send_telegram(chat_id, text)
        if result.get("ok"):
            return jsonify({"success": True, "message": f"Отправлено → {engineer_name}"})
        else:
            return jsonify({"error": str(result)}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/seniors")
def seniors():
    return jsonify({"seniors": SENIORS})


if __name__ == "__main__":
    port  = _cfg.getint('server', 'port', fallback=5000)
    debug = _cfg.getboolean('server', 'debug', fallback=True)
    print(f"ITS сервер запущен: http://localhost:{port}")
    app.run(debug=debug, port=port)
