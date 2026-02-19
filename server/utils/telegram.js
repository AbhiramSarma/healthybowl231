/**
 * Telegram notification helper - sends new order alerts to admin
 * Requires: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID in env
 */

const sendOrderNotification = async (order) => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').replace(/^bot/i, '').trim();
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('[Telegram] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
        return;
    }

    try {
        const items = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'N/A';
        const address = (order.customer?.address || '').slice(0, 80);
        const frontendUrl = process.env.FRONTEND_URL || 'https://healthybowl231.vercel.app';

        const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const orderLabel = escape(order.orderId || order._id);
        const name = escape(order.customer?.name || 'N/A');
        const phone = escape(order.customer?.phone || 'N/A');
        const addr = escape(address) + (address.length >= 80 ? '...' : '');
        const itemsEsc = escape(items);

        const text = [
            '🆕 <b>New Order Received</b>',
            '',
            `📋 Order: <code>${orderLabel}</code>`,
            `👤 Customer: ${name}`,
            `📱 Phone: ${phone}`,
            `📍 Address: ${addr}`,
            '',
            `🛒 Items: ${itemsEsc}`,
            `💰 Total: ₹${order.totalAmount}`,
            `💳 Payment: ${order.paymentMethod || 'N/A'} (${order.status || 'N/A'})`,
            '',
            `🔗 Admin: ${frontendUrl}/admin/dashboard`,
        ].join('\n');

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[Telegram] Send failed:', res.status, err);
        }
    } catch (err) {
        console.error('[Telegram] Error:', err.message);
    }
};

module.exports = { sendOrderNotification };
