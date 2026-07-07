import { v4 as uuidv4 } from 'uuid';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_RAW = process.env.TELEGRAM_CHANNEL || '';
const CHANNEL = CHANNEL_RAW.replace(/^https:\/\/t\.me\//, '').replace(/^@/, '');
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OWNER_ID = 8906906175;

let offset = 0;
let query;

export async function initBot(pgQuery) {
  query = pgQuery;
  if (!BOT_TOKEN) { console.log('Bot: no TELEGRAM_BOT_TOKEN, disabled'); return; }
  console.log('Bot: starting...');

  const me = await call('getMe');
  if (!me.ok) {
    console.error('Bot: TOKEN INVALID! Check TELEGRAM_BOT_TOKEN');
    return;
  }
  console.log(`Bot: @${me.result.username} (${me.result.id})`);

  if (CHANNEL) {
    const check = await call('getChatMember', { chat_id: `@${CHANNEL}`, user_id: me.result.id });
    if (check.ok && ['administrator','creator'].includes(check.result.status)) {
      console.log(`Bot: ✅ admin of @${CHANNEL}`);
    } else {
      console.log(`Bot: ⚠️ not admin of @${CHANNEL} — /sub will fail. Add @${me.result.username} as admin.`);
    }
  }

  // clear stale polling sessions before starting
  await call('getUpdates', { offset: -1, timeout: 1 });
  await new Promise(r => setTimeout(r, 2000));
  poll();
}

async function call(method, body = {}) {
  try {
    const url = `${API}/${method}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    });
    return await r.json();
  } catch (e) {
    console.error(`Bot: API call ${method} failed:`, e.message);
    return { ok: false, error: e.message };
  }
}

async function poll() {
  try {
    const data = await call('getUpdates', { offset, timeout: 30 });
    if (data.ok && data.result) {
      for (const u of data.result) {
        offset = u.update_id + 1;
        try { await handleUpdate(u); } catch (e) {
          console.error('Bot: handleUpdate error:', e.message);
        }
      }
    } else if (!data.ok) {
      console.error('Bot: getUpdates failed:', JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    console.error('Bot: poll error:', e.message);
  }
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
      + '/help — помощь\n'
      + '/start — приветствие'
    ),

    '/link': async () => {
      if (args.length < 2) return send(chatId, '❓ Использование: /link ТВОЙ_ID\n\nID можно скопировать в Настройках на сайте.');
      const userId = args[1];
      const user = (await query('SELECT * FROM users WHERE id = $1', [userId])).rows[0];
      if (!user) return send(chatId, '❌ Аккаунт не найден. Проверь ID.');
      if (user.telegram_chat_id) return send(chatId, '⚠️ Этот аккаунт уже привязан к Telegram.');

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
      send(chatId, '🎁 <b>Промокоды</b>\n\nПромокоды распространяются в Telegram канале и личных сообщениях. Следи за каналом — там публикуются новые коды!');
    },

    '/gencode': async () => {
      if (chatId !== OWNER_ID) return send(chatId, '⛔ Нет доступа.');
      if (args.length < 2) return send(chatId, '❓ Использование: /gencode <сумма> [количество]\n\nПример: /gencode 5000 10 (создаст 10 кодов по 5000₽)');
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount < 1) return send(chatId, '❌ Укажи сумму больше 0.');
      const count = Math.min(100, Math.max(1, parseInt(args[2]) || 1));
      let codes = [];
      for (let i = 0; i < count; i++) {
        const code = (Math.random().toString(36).toUpperCase() + Math.random().toString(36).toUpperCase()).slice(0, 8);
        await query('INSERT INTO promo_codes (code, amount, max_uses, used_count, active) VALUES ($1,$2,$3,0,true) ON CONFLICT (code) DO NOTHING', [code, amount, 1]);
        codes.push(code);
      }
      let msg = `✅ Создано <b>${count}</b> промокодов по <b>${amount.toLocaleString()}₽</b>\n\n`;
      for (const c of codes.slice(0, 20)) msg += `<code>${c}</code>\n`;
      if (codes.length > 20) msg += `...и ещё ${codes.length - 20}\n`;
      msg += '\nВводить на сайте в поле ПРОМО';
      send(chatId, msg);
    },
  };

  const handler = cmds[cmd];
  if (handler) await handler();
  else if (text.startsWith('/')) send(chatId, '❌ Неизвестная команда. /help');
}

async function send(chatId, text) {
  return call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}
