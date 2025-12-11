import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// --- CONFIG ---
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASS = process.env.ADMIN_PASS;

// DATABASES
let loggedAdmins = new Set();
let userDB = new Set();
let fileDB = {};
let waitingFor = {}; // per user waiting status

// --- START HANDLER ---
bot.start(async (ctx) => {
    userDB.add(ctx.chat.id);

    const payload = ctx.payload;

    // PAYLOAD HANDLER (AUTO FILE SENDER)
    if (payload && fileDB[payload]) {
        await ctx.replyWithDocument(fileDB[payload].file_id, {
            caption: "Here is your file 📥"
        });
        return;
    }

    // Normal welcome
    await ctx.reply("Welcome to Pika Downloads Bot!");
});

// --- ADMIN LOGIN ---
bot.command("admin", async (ctx) => {
    if (ctx.chat.id != ADMIN_ID) return;

    waitingFor[ctx.chat.id] = "admin_pass";
    await ctx.reply("Send admin password:");
});

bot.on("text", async (ctx) => {
    const uid = ctx.chat.id;

    // CHECK PASSWORD INPUT
    if (waitingFor[uid] === "admin_pass") {
        if (ctx.message.text === ADMIN_PASS) {
            loggedAdmins.add(uid);
            waitingFor[uid] = null;
            await ctx.reply("Admin login successful! 🎉");
        } else {
            waitingFor[uid] = null;
            await ctx.reply("Wrong password ❌");
        }
        return;
    }

    // TEXT ADS
    if (waitingFor[uid] === "send_text_ads" && loggedAdmins.has(uid)) {
        waitingFor[uid] = null;
        for (let user of userDB) {
            try {
                await ctx.telegram.sendMessage(user, ctx.message.text);
            } catch {}
        }
        await ctx.reply("Text ads sent ✔");
        return;
    }
});

// --- UPLOAD FEATURE ---
bot.command("upload", async (ctx) => {
    if (!loggedAdmins.has(ctx.chat.id)) return;

    waitingFor[ctx.chat.id] = "upload_file";
    await ctx.reply("Send your file:");
});

// RECEIVE FILE
bot.on("document", async (ctx) => {
    const uid = ctx.chat.id;

    if (waitingFor[uid] === "upload_file" && loggedAdmins.has(uid)) {
        waitingFor[uid] = null;

        const fileId = ctx.message.document.file_id;
        const key = Math.random().toString(36).substring(6);

        fileDB[key] = { file_id: fileId };

        const link = `https://t.me/${ctx.botInfo.username}?start=${key}`;

        await ctx.reply(`Your download link:\n${link}`);
    }
});

// --- TEXT ADS ---
bot.command("sendads", async (ctx) => {
    if (!loggedAdmins.has(ctx.chat.id)) return;

    waitingFor[ctx.chat.id] = "send_text_ads";
    await ctx.reply("Send the ad message:");
});

// --- IMAGE ADS ---
bot.command("sendimgads", async (ctx) => {
    if (!loggedAdmins.has(ctx.chat.id)) return;
    waitingFor[ctx.chat.id] = "send_image_ads";

    await ctx.reply("Send the image:");
});

bot.on("photo", async (ctx) => {
    const uid = ctx.chat.id;

    if (waitingFor[uid] === "send_image_ads") {
        waitingFor[uid] = null;
        const file = ctx.message.photo.pop().file_id;

        for (let user of userDB) {
            try {
                await ctx.telegram.sendPhoto(user, file);
            } catch {}
        }

        await ctx.reply("Image ads sent ✔");
    }
});

// --- VIDEO ADS ---
bot.command("sendvidads", async (ctx) => {
    if (!loggedAdmins.has(ctx.chat.id)) return;
    waitingFor[ctx.chat.id] = "send_video_ads";

    await ctx.reply("Send the video:");
});

bot.on("video", async (ctx) => {
    const uid = ctx.chat.id;

    if (waitingFor[uid] === "send_video_ads") {
        waitingFor[uid] = null;
        const file = ctx.message.video.file_id;

        for (let user of userDB) {
            try {
                await ctx.telegram.sendVideo(user, file);
            } catch {}
        }

        await ctx.reply("Video ads sent ✔");
    }
});

// --- START BOT ---
bot.launch();
console.log("Bot is running...");
