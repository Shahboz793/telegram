/* ============================================================
   ORDERS.JS — Buyurtma yuborish, 1–2–1–2 navbat algoritmi,
   mijoz ma'lumotlari, Telegramga yuborish.
============================================================ */

/* ------------------------------------------------------------
   1–2–1–2 NAVBAT ALGORTIMI
------------------------------------------------------------ */
function getNextRecipient() {
    const key = "order_send_turn";
    let turn = parseInt(localStorage.getItem(key) || "1", 10);

    let username;

    if (turn === 1) {
        username = "onatili_premium";   // 1-xabar shu odamga
        turn = 2;
    } else {
        username = "shahbozzbek";        // 2-xabar shu odamga
        turn = 1;
    }

    localStorage.setItem(key, turn.toString());
    return username;
}

/* ------------------------------------------------------------
   BUYURTMA MATNINI GENERATSIYA QILISH
------------------------------------------------------------ */
function buildOrderText(customer) {
    let totalPrice = 0;
    let lines = [];

    cart.forEach((c, i) => {
        const p = products[c.index];
        if (!p) return;

        const summa = p.price * c.qty;
        totalPrice += summa;

        const line = `${i + 1}) ${p.emoji || "💅"} ${p.name} — ${c.qty} dona × ${formatPrice(p.price)} = ${formatPrice(summa)} so‘m`;
        lines.push(line);
    });

    const text =
`✨ YANGIOBOD PREMIUM MAGAZIN
━━━━━━━━━━━━━━━━━━━
🧺 Savatdagi mahsulotlar:

${lines.map(l => "• " + l).join("\n")}

💰 Jami: ${formatPrice(totalPrice)} so‘m
📦 Kategoriya: Kosmetika
━━━━━━━━━━━━━━━━━━━
👤 Ismi: ${customer.name}
📱 Telefon: ${customer.phone}
📍 Manzil: ${customer.address}
✍️ Izoh: _______
`;

    return text;
}

/* ------------------------------------------------------------
   TELEGRAM LINK OCHISH
------------------------------------------------------------ */
function openOrderInTelegram(text) {
    const encoded = encodeURIComponent(text);

    // navbat bo‘yicha kimga yuboriladi
    const username = getNextRecipient();

    // username orqali Telegram chatini ochamiz
    const url = `https://t.me/${username}?text=${encoded}&t=${Date.now()}`;

    openTelegramUrl(url);
}

/* ------------------------------------------------------------
   ASOSIY BUYURTMA YUBORISH FUNKSIYASI
------------------------------------------------------------ */
function sendOrder() {
    if (cart.length === 0) {
        showToast("Savat bo‘sh!");
        return;
    }

    const customer = askCustomerInfo();
    if (!customer) {
        showToast("Ma'lumotlar to‘liq emas.");
        return;
    }

    const text = buildOrderText(customer);

    // Telegramga yuborish
    openOrderInTelegram(text);

    // Savatni tozalash
    setTimeout(() => {
        cart = [];
        updateCartUI();
        toggleCartSheet(false);
    }, 300);
}

/* ------------------------------------------------------------
   EXPORT / GLOBAL
------------------------------------------------------------ */
window.sendOrder = sendOrder;
