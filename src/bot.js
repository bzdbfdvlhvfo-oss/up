const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_RAW = process.env.TELEGRAM_CHANNEL || '';
const CHANNEL = CHANNEL_RAW.replace(/^https:\/\/t\.me\//, '').replace(/^@/, '');
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;
let query;

export async function initBot(pgQuery) {
  query = pgQuery;
  if (!BOT_TOKEN) { console.log('No TELEGRAM_BOT_TOKEN, bot disabled'); return; }
  console.log('Telegram bot starting...');

  if (CHANNEL) {
    const info = await call('getMe');
    if (info.ok) {
      const check = await call('getChatMember', { chat_id: `@${CHANNEL}`, user_id: info.result.id });
      if (check.ok && ['administrator','creator'].includes(check.result.status)) {
        console.log(`✅ Бот админ канала @${CHANNEL}`);
      } else {
        console.log(`⚠️  Бот не админ @${CHANNEL}. /sub не работает. Добавь @${info.result.username} в админы канала.`);
      }
    }
  }

  poll();
}

async function call(method, body = {}) {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch { return { ok: false }; }
}

async function poll() {
  try {
    const data = await call('getUpdates', { offset, timeout: 30 });
    if (data.ok) {
      for (const u of data.result || []) {
        offset = u.update_id + 1;
        await handleUpdate(u);
      }
    }
  } catch {}
  setTimeout(poll, 1000);
}

async function handleUpdate(u) {
  const msg = u.message;
  if (!msg || !msg.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const args = text.split(/\s+/);
  const cmd = args[0].toLowerCase();

  const cmds = {
    '/start': () => send(chatId,
      '🎮 <b>CS 2 UP ↑</b>\n\n'
      + 'Привяжи Telegram к аккаунту и получи бонусы!\n\n'
      + '📌 <b>Команды:</b>\n'
      + '/link &lt;id&gt; — привязать аккаунт (+100₽)\n'
      + '/sub — проверить подписку (+300₽)\n'
      + '/balance — баланс\n'
      + '/profile — профиль\n'
      + '/promo — промокоды\n'
      + '/help — помощь\n\n'
      + '👇 <b>Как привязать:</b>\n'
      + '1. Зайди на сайт → Настройки\n'
      + '2. Скопируй свой ID\n'
      + '3. Отправь /link ТВОЙ_ID сюда'
    ),

    '/help': () => send(chatId,
      '🎯 <b>CS 2 UP — Бот</b>\n\n'
      + '/link &lt;id&gt; — привязать аккаунт, +100₽\n'
      + '/sub — проверить подписку на канал, +300₽\n'
      + '/balance — проверить баланс\n'
      + '/profile — информация о профиле\n'
      + '/promo — список активных промокодов\n'
      + '/start — приветствие'
    ),

    '/link': async () => {
      if (args.length < 2) return send(chatId, '❓ Использование: /link ТВОЙ_ID\n\nID можно скопировать в Настройках на сайте.');
      const userId = args[1];
      const user = (await query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
      if (!user) return send(chatId, '❌ Аккаунт не найден. Проверь ID.');
      if (user.telegram_chat_id) return send(chatId, '⚠️ Этот аккаунт уже привязан к Telegram.');

      // Check if this chat is already linked to another account
      const existing = (await query('SELECT id FROM users WHERE telegram_chat_id = $1', [String(chatId)])).rows[0];
      if (existing) return send(chatId, '⚠️ Этот Telegram уже привязан к другому аккаунту.');

      await query('UPDATE users SET telegram_chat_id = $1, balance = balance + 100 WHERE id = $2', [String(chatId), userId]);
      await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
        [uuidv4(), userId, 'telegram_link', 100, 'Привязка Telegram +100₽']);

      send(chatId, '✅ Аккаунт привязан!\n💰 +100₽ зачислено.\n\nТеперь проверь подписку — /sub');
    },

    '/sub': async () => {
      const user = (await query('SELECT * FROM users WHERE telegram_chat_id = $1', [String(chatId)])).rows[0];
      if (!user) return send(chatId, '❌ Сначала привяжи аккаунт: /link ТВОЙ_ID');
      if (user.telegram_sub_checked) return send(chatId, '✅ Бонус за подписку уже получен!');

      if (!CHANNEL) return send(chatId, '❌ Канал не настроен.');

      const member = await call('getChatMember', { chat_id: `@${CHANNEL}`, user_id: chatId });

      if (!member.ok) {
        return send(chatId, `❌ Бот не может проверить подписку. Убедись что бот — админ канала.\nКанал: https://t.me/${CHANNEL}`);
      }

      const status = member.result.status;

      if (['member', 'administrator', 'creator'].includes(status)) {
        await query('UPDATE users SET telegram_sub_checked = true, balance = balance + 300 WHERE id = $1', [user.id]);
        await query('INSERT INTO transactions (id,user_id,type,amount,description) VALUES ($1,$2,$3,$4,$5)',
          [uuidv4(), user.id, 'telegram_sub', 300, 'Подписка на канал +300₽']);
        send(chatId, '✅ Подписка подтверждена!\n💰 +300₽ зачислено.');
      } else {
        send(chatId, `❌ Ты не подписан на канал.\nПодпишись: https://t.me/${CHANNEL}\nи нажми /sub снова.`);
      }
    },

    '/balance': async () => {
      const user = (await query('SELECT * FROM users WHERE telegram_chat_id = $1', [String(chatId)])).rows[0];
      if (!user) return send(chatId, '❌ Сначала привяжи аккаунт: /link ТВОЙ_ID');
      send(chatId, `💰 Баланс: <b>${user.balance.toLocaleString()} ₽</b>`);
    },

    '/profile': async () => {
      const user = (await query('SELECT * FROM users WHERE telegram_chat_id = $1', [String(chatId)])).rows[0];
      if (!user) return send(chatId, '❌ Сначала привяжи аккаунт: /link ТВОЙ_ID');
      send(chatId,
        `👤 <b>Профиль</b>\n\n`
        + `Ник: <b>${user.username}</b>\n`
        + `ID: <code>${user.id}</code>\n`
        + `Баланс: <b>${user.balance.toLocaleString()} ₽</b>\n`
        + `Telegram: ✅ привязан\n`
        + `Подписка: ${user.telegram_sub_checked ? '✅' : '❌'}`
      );
    },

    '/promo': async () => {
      const promos = (await query('SELECT code, amount, max_uses, used_count FROM promo_codes ORDER BY amount DESC')).rows;
      let txt = '🎁 <b>Промокоды</b>\n\n';
      for (const p of promos.slice(0, 10)) {
        const left = p.max_uses - p.used_count;
        txt += `<code>${p.code}</code> — ${p.amount.toLocaleString()}₽ (осталось ${left})\n`;
      }
      txt += '\nВводи на сайте в поле ПРОМО';
      send(chatId, txt);
    },
  };

  const handler = cmds[cmd];
  if (handler) await handler();
  else if (text.startsWith('/')) send(chatId, '❌ Неизвестная команда. /help');
}

async function send(chatId, text) {
  return call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}
