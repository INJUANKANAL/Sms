const Telegraf = require('telegraf')
const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')
const services = require('./services.json')
const countries = require('./countries.json')
const Config = require('./config');
const config = new Config();
const bot = new Telegraf(config.get('telegram', 'token'));
const Database = require('./database');
const refill = require('./refill');
const API = require('./api')
const RedisSession = require('telegraf-session-redis')
const callbackQiwi = require('./minqiwi');

bot.use(Telegraf.log())
bot.use(async (ctx, next) => {
    if (ctx.chat && ctx.chat.id) {
    if (typeof ctx.chat.username === 'undefined') {
        ctx.reply('❌ Установите никнейм в телеге для корректной работы бота');
        return;
    }
    ctx.user = await Database.updateUsername(ctx.chat.id, typeof ctx.chat.username != 'undefined' ? ctx.chat.username.replace(/@/g, "") : '');
    next();
}
});
const token = config.get('qiwi', 'token');
const wally = config.get('qiwi', 'wallet');
const wallet = new callbackQiwi(token);

const session = new RedisSession({
    store: {
      host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
      port: process.env.TELEGRAM_SESSION_PORT || 6379
    }
  })
  
bot.use(session)


async function startCommand(ctx) {
    let kb = ['🍭 Купить', '🧜🏻 Профиль'];
    let admKeyboard = [
        ...kb, '👑 Админка'
    ];
    await ctx.replyWithSticker('CAACAgIAAxkBAAEHh8Zf8JKs_mlfasRPBA6bwzEZZfD4ggACDgADDkfHKNYTYJGwbH6ZHgQ')
    ctx.reply('💫 Добро пожаловать, держи менюшку', Markup
    .keyboard([ctx.user.admin == 1 ? admKeyboard : kb])
    .resize()
    .extra()
  )
}

bot.command('start', startCommand);
bot.hears('🔙 Назад', startCommand);

bot.action('cancel_change_wallet', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.changeWallet = false;
    ctx.reply(`❌ Произошла отмена`);
});

bot.action('cancel_change_token', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.changeWallet = false;
    ctx.reply(`❌ Произошла отмена`);
});

bot.hears('🎟 Сменить токен', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.changeToken = true;
    ctx.reply(`Введите новый токен`, Markup.inlineKeyboard([
        Markup.callbackButton('❌ Отмена', 'cancel_change_token')
    ]).extra());
});

bot.hears('🎫 Сменить кошелек', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.changeWallet = true;
    ctx.reply(`Введите новый кошелек`, Markup.inlineKeyboard([
        Markup.callbackButton('❌ Отмена', 'cancel_change_wallet')
    ]).extra());
});

bot.hears('⚙ Настройка Qiwi', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.reply(`Выберите опцию`, Markup.keyboard([
        ['🎟 Сменить токен'],
        ['🎫 Сменить кошелек'],
        ['🎠 Проверка киви'],
        ['🔙 Назад']
    ]).resize().extra()) 
});

bot.hears('💻 Количество людей в боте', async ctx => {
    if (!ctx.user.admin) return;
    const users = await Database.getUsers();
    ctx.reply(`В боте зарегистрировано ${users.length} человек`);
});

bot.action('cancel_add_admin', async ctx => {
    ctx.session.addAdmin = false;
    ctx.reply(`❌ Произошла отмена`);
});

bot.action('cancel_remove_admin', async ctx => {
    ctx.session.removeAdmin = false;
    ctx.reply(`❌ Произошла отмена`);
});

bot.action('add_admin', async ctx => {
    ctx.session.addAdmin = true;
    ctx.reply(`Введите ник пользователя`, Markup.inlineKeyboard([
        [Markup.callbackButton('❌ Отмена', 'cancel_add_admin')]
    ]).extra());
});

bot.action('remove_admin', async ctx => {
    ctx.session.removeAdmin = true;
    ctx.reply(`Введите ник пользователя`, Markup.inlineKeyboard([
        [Markup.callbackButton('❌ Отмена', 'cancel_remove_admin')]
    ]).extra());
});

bot.hears('👤 Админы', async ctx => {
    if (!ctx.user.admin) return;
    const users = await Database.getUsers();
    const admins = users.filter(user => user.admin == 1);
    let adm = 'Админы: \n\n';
    for (let i = 0; i < admins.length; i++) {
        const admin = admins[i];
        console.log(admin)
        adm += `ID: ${admin.telegram_id}\nНик: @${admin.telegram_username}\n\n`
    }
    ctx.reply(adm, Markup.inlineKeyboard([
        [Markup.callbackButton('➕ Добавить администратора', 'add_admin')],
        [Markup.callbackButton('❌ Удалить администратора', 'remove_admin')]
    ]).extra());

});

bot.action('cancel_refill_balance', async ctx => {
    ctx.session.refillBalance = false;
    ctx.session.refillBalanceSetAmount = false;
    ctx.editMessageText(`❌ Произошла отмена`);
});

bot.hears("💷 Пополнить баланс", async ctx => {
    if (!ctx.user.admin) return;
    ctx.session.refillBalance = true;
    ctx.reply(`Введите логин пользователя для пополнения баланса`, Markup.inlineKeyboard([
        Markup.callbackButton('❌ Отмена', 'cancel_refill_balance')
    ]).extra());
});

bot.hears("👑 Админка", async (ctx) => {
    if (!ctx.user.admin) return;

    ctx.reply(`Админ-функции`, Markup.keyboard([
        ['💷 Пополнить баланс'],
        ['❄ Сменить наценку'],
        ['⚙ Настройка Qiwi'],
        ['✉ Рассылка'],
        ['💻 Количество людей в боте'],
        ['👤 Админы'],
        ['🔙 Назад']
    ]).resize().extra()) 
});

bot.action('cancel_tip', async ctx => {
    ctx.session.change_tip = false;
    ctx.reply(`❌ Произошла отмена`);
});

bot.hears('❄ Сменить наценку', async (ctx) => {
    if (!ctx.user.admin) return;

    ctx.session.change_tip = true;
    ctx.reply(`Наценка сейчас составляет ${config.get('service', 'tip')}. Введите новую цену.`, Markup.inlineKeyboard([
        Markup.callbackButton('❌ Отмена', 'cancel_tip')
    ]).extra());
});

bot.hears('🎠 Проверка киви', async (ctx) => {
    if (!ctx.user.admin) return;

   // const token = config.get('qiwi', 'token');
    const wally = config.get('qiwi', 'wallet');
    wallet.getOperationHistory(wally, {rows: 1, operation: "IN"}, async (err, operations) => {
        if (err) {
            ctx.reply(`Произошла ошибка: `+err);
            return;
        }
        ctx.reply(`Токен и кошелек в порядке`);
    });

});

bot.hears('✉ Рассылка', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.sendMessages = true;
    const keyboard = Markup.inlineKeyboard([
        [Markup.callbackButton('❌ Отмена', 'cancel')]
    ]);
    ctx.reply(`✉ Введите сообщение`, Extra.markup(keyboard));
});




bot.action('cancel', async (ctx) => {
    if (!ctx.user.admin) return;
    ctx.session.sendMessages = false;
    ctx.editMessageText(`👌 Отправка рассылки отменена`);
})

bot.hears('🧜🏻 Профиль', async (ctx) => {
    await ctx.replyWithSticker('CAACAgIAAxkBAAEHh-df8JdH2bOCOwN5oYwYsb26sJRxbgACMwADDkfHKGxLD9RFtmVqHgQ')
    ctx.reply([
        `🏦 Ваш баланс: ${ctx.user.balance} RUB`,
        `🙋🏻‍♂️ Ваш id: ${ctx.user.telegram_id}`,
        `🛍 Кол-во покупок: ${ctx.user.purchases}`
    ].join('\n'), Markup.inlineKeyboard([
        [Markup.callbackButton('💸 Пополнить баланс', 'refill')]
    ]).extra())
});


bot.action('refill', async (ctx) => {
    await ctx.replyWithSticker('CAACAgIAAxkBAAEHh-Vf8JbApR8CY38oAr2ej5JLhGbGtAACOAADDkfHKLFQmvkn6ZxTHgQ');
    return ctx.reply([
        'Пополнение QIWI:',
        '➖➖➖➖➖➖➖➖',
        '💦 Номер - +' + config.get('qiwi', 'wallet'),
        '💦 Комментарий - ' + ctx.user.telegram_id,
        '➖➖➖➖➖➖➖➖',
        'Просто пополни этот киви с указанным выше комментарием на любую сумму и деньги в течении 1-2 минуты придут тебе на счет!',
        '⚠ Важно! Принимаются ТОЛЬКО рубли.',
        '➖➖➖➖➖➖➖➖'
    ].join('\n'));
});

bot.hears('🍭 Купить', async (ctx) => {
    await ctx.replyWithSticker('CAACAgIAAxkBAAEHh8Vf8JKsZY0EXnWmY_irAAFXoxjfmIEAAhEAAw5Hxyh3gX6GDDp5wx4E')
    let arr = [];
    let i = 0;
    const _services = await Promise.all(await API.getPricesButtons(services));
    console.log(_services)
    _services.map(service => {
        if (i == 2)
            i = 0;
        if (i == 0)
            arr.push([]);
        const {name, id, price} = service;
        arr[arr.length - 1].push(Markup.callbackButton(`🔹 ${name} | ${String(parseInt(price)+parseInt(config.get('service', 'tip')))} ₽`, 'view_service ' + id));
        i++;
    })
  return ctx.reply('Выберите номер', Markup.inlineKeyboard(arr).extra());
});

bot.action(/succ (.+)/, async(ctx) => {
    await API.completeActivation(ctx.match[ctx.match.length-1]);
    ctx.editMessageText(`🙏 Спасибо за активацию`);
});

bot.action(/wait_code (.+)/, async(ctx) => {
    try {
        const id = ctx.match[ctx.match.length-1];
        const intrvl = setInterval(async () => {
            try {
                const code = await API.getStatus(id);
                clearInterval(intrvl);
                if (code != "none")
                    ctx.editMessageText(`Ваш код: ${code}`, Markup.inlineKeyboard(
                        [Markup.callbackButton('✅ Активация успешна', 'succ ' + id)]
                    ).extra());
            } catch(ex) {

            }
        }, 1000);
    } catch(ex) {
        console.error(ex);
    }    
});

bot.action(/operation_cancel (.+)/, async(ctx) => {
    await API.cancelActivation(ctx.match[ctx.match.length-1]);
    await Database.addMoney(ctx.chat.id, ctx.session.money);
    ctx.editMessageText(`❌ Активация отменена`);
});

bot.action(/buy_activation (.+)/, async (ctx) => {
    try {
        console.log(ctx.match[ctx.match.length-1])
        const [service_id, country_id, price] = ctx.match[ctx.match.length-1].split('/');
        if (ctx.user.balance < price) {
            ctx.reply('⚠ Недостаточно денег на балансе');
            return;
        }
        ctx.session.money = price;
        const {operation_id, number} = await API.getNumber(service_id, country_id);
        ctx.editMessageText(`Ваш номер: ${number}`, Markup.inlineKeyboard([
            [Markup.callbackButton('✅ Код отправлен', 'wait_code ' + operation_id)],
            [Markup.callbackButton('❌ Отменить', 'operation_cancel ' + operation_id)]
        ]).extra());
        Database.incrementPurchases(ctx.chat.id);
        Database.addMoney(ctx.chat.id, price * -1);
    } catch(ex) {
        console.error(ex);
        ctx.reply(`⚠ ${ex}`);
    }    
});

bot.action(/view_service (.+)/, async (ctx) => {
    let arr = [];
    const _countries = await Promise.all(await API.getCountriesButtons(ctx.match[ctx.match.length-1], countries));
    _countries.map((country, i) => {
        arr.push(
            [Markup.callbackButton(
                `${country.flag} ${country.name} | ${String(parseInt(country.price)+parseInt(config.get('service', 'tip')))} ₽ | ${country.count}`, 'buy_activation ' + ctx.match[ctx.match.length-1] + '/' + country.id + '/' + String(parseInt(country.price)+parseInt(config.get('service', 'tip')))
           )]
        )
    })

    return ctx.reply(`Выберите страну`, Markup.inlineKeyboard(arr).extra());
})

bot.use(async(ctx, next) => {
    if (!ctx.user.admin) {
        return next();
    }
    if (ctx.session.sendMessages) {
        const users = await Database.getUsers();
        users.map(async(user) => {
            if (typeof ctx.message.photo === 'undefined') {
                ctx.telegram.sendMessage(user.telegram_id, ctx.message.text).catch(err => console.error(err));
            } else {
                ctx.telegram.sendPhoto(user.telegram_id, ctx.message.photo[ctx.message.photo.length-1]['file_id'], {
                    caption: ctx.message.caption
                }).catch(err => console.error(err));
            }
        });
        ctx.session.sendMessages = false;
        ctx.reply(`✅ Рассылка завершена.`);
    } else if (ctx.session.changeWallet) {
        config.set('qiwi', 'wallet', ctx.message.text.replace("+", ""));
        ctx.reply(`✅ Номер кошелька изменен успешно`);
        ctx.session.changeWallet = false;
    } else if (ctx.session.changeToken) {
        config.set('qiwi', 'token', ctx.message.text);
        wallet.changeToken(ctx.message.text);
        ctx.reply(`✅ Токен изменен успешно`);
        ctx.session.changeToken = false;
    } else if (ctx.session.change_tip) {
        config.set('service', 'tip', ctx.message.text);
        ctx.reply(`✅ Наценка изменен успешно`);
        ctx.session.change_tip = false;
    } else if (ctx.session.removeAdmin) {
        ctx.session.removeAdmin = false;
        await Database.removeAdmin(ctx.message.text.replace(/@/g, ""));
        ctx.reply(`✅ Админка удалена для пользователя @${ctx.message.text.replace(/@/g, "")}`)
    } else if (ctx.session.addAdmin) {
        ctx.session.addAdmin = false;
        await Database.addAdmin(ctx.message.text.replace(/@/g, ""));
        ctx.reply(`✅ Админка добавлена для пользователя @${ctx.message.text.replace(/@/g, "")}`)
    } else if (ctx.session.refillBalance) {
        ctx.session.refillBalance = false;
        ctx.session.refillBalanceSetAmount = true;
        ctx.session.username = ctx.message.text.replace(/@/g, "");
        await ctx.reply(`Введите сумму для начисления`, Markup.inlineKeyboard([
            Markup.callbackButton('❌ Отмена', 'cancel_refill_balance')
        ]).extra());
    } else if (ctx.session.refillBalanceSetAmount && !isNaN(ctx.message.text)) {
        ctx.session.refillBalanceSetAmount = false;
        const user = await Database.findUser(ctx.session.username, false);
        await Database.addMoney(user.telegram_id, parseInt(ctx.message.text));
        await ctx.reply(`✅ Начислено ${ctx.message.text} рублей пользователю @${ctx.session.username}`);
    }

    next();
});

bot.launch();
refill(wallet);