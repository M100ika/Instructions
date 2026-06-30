from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

# ─── НАСТРОЙКИ ───────────────────────────────────────────
ZNUNY_URL = "https://support.nu.edu.kz/znuny/nph-genericinterface.pl/Webservice/GenericTicketConnectorREST"
ZNUNY_USER = "api_readonly"
ZNUNY_PASS = "Qwerty123!"

TELEGRAM_TOKEN = "8637132565:AAGWlesTF2vmQeSmbx8qEtmchMprqj57r70"

# Старшие инженеры и их подчинённые
SENIORS = [
    {
        "name": "Maxat Suieubayev",
        "owner_id": 17,
        "chat_id": 431943952,
        "subordinates": [
            {"name": "Марат",  "chat_id": 486489083},
            {"name": "Адиль",  "chat_id": None},
            {"name": "Архат",  "chat_id": 7393445229},
        ]
    },
    {
        "name": "Askar Sharipov",
        "owner_id": 16,
        "chat_id": None,
        "subordinates": []
    },
    {
        "name": "Ramazan Abdrakhmanov",
        "owner_id": 18,
        "chat_id": None,
        "subordinates": []
    },
    {
        "name": "Temirbek Sarsembekov",
        "owner_id": 19,
        "chat_id": None,
        "subordinates": []
    },
]
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
    print("ITS сервер запущен: http://localhost:5000")
    app.run(debug=True, port=5000)
