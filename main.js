import express from "express";
import { Telegraf } from "telegraf";

const app = express();
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const ADMIN_PASS = process.env.ADMIN_PASS;

let adminLogged = false;
let fileStore = {};
let users = new Set();

// -------------------- START -------------------- //
bot.start(async (ctx) => {
    users.add(ctx.chat.id);
    await ctx.reply("Welcome to Pika Downloads Bot!");
});

// -------------------- ADMIN LOGIN -------------------- //
bot.command("admin", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID) return;
    adminLogged = false;
    await ctx.reply("Send admin password:");
});

bot.on("text", async (ctx) => {
    if (ctx.chat.id === ADMIN_ID && !adminLogged) {
        if (ctx.message.text === ADMIN_PASS) {
            adminLogged = true;
            return ctx.reply("Admin logged in successfully!");
        }
    }
});

// -------------------- UPLOAD FILE -------------------- //
bot.command("upload", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID || !adminLogged) return;
    await ctx.reply("Send the file you want to upload");
});

bot.on("document", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID || !adminLogged) return;
    const file = ctx.message.document.file_id;
    const code = Math.random().toString(36).substring(2, 12);
    fileStore[code] = file;

    await ctx.reply(
        `File saved!\nSend this URL to user:\nhttps://t.me/${process.env.BOT_USERNAME}?start=${code}`
    );
});

// -------------------- FILE DELIVERY -------------------- //
bot.on("message", async (ctx) => {
    if (ctx.message.text?.startsWith("/start ")) {
        const code = ctx.message.text.split(" ")[1];
        if (fileStore[code]) {
            return ctx.replyWithDocument(fileStore[code]);
        }
    }
});

// -------------------- SEND ADS -------------------- //
bot.command("sendads", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID || !adminLogged) return;
    ctx.reply("Send the ad message:");
    bot.once("text", async (msg) => {
        users.forEach((u) => bot.telegram.sendMessage(u, msg.message.text));
        msg.reply("Ad sent to all users!");
    });
});

// IMG ADS
bot.command("sendimgads", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID || !adminLogged) return;
    ctx.reply("Send image:");
    bot.once("photo", async (msg) => {
        users.forEach((u) =>
            bot.telegram.sendPhoto(u, msg.message.photo[0].file_id)
        );
        msg.reply("Image ad sent!");
    });
});

// VIDEO ADS
bot.command("sendvidads", async (ctx) => {
    if (ctx.chat.id !== ADMIN_ID || !adminLogged) return;
    ctx.reply("Send video:");
    bot.once("video", async (msg) => {
        users.forEach((u) =>
            bot.telegram.sendVideo(u, msg.message.video.file_id)
        );
        msg.reply("Video ad sent!");
    });
});

// -------------------- EXPRESS WEBHOOK -------------------- //
app.post(`/${process.env.BOT_TOKEN}`, (req, res) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
});

// Render port
app.get("/", (req, res) => res.send("Bot Running!"));

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});
