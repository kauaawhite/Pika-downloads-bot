import { Telegraf } from "telegraf";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

// ENV
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASS = process.env.ADMIN_PASS;

// Memory storage
const sessions = {};
const files = {};
const users = new Set();

// EXPRESS KEEPALIVE (Render requirement)
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000);

// START: Track users
bot.start((ctx) => {
  users.add(ctx.chat.id);

  const code = ctx.startPayload;

  if (code && files[code]) {
    ctx.replyWithDocument(files[code], { caption: "Here is your file." });
  } else {
    ctx.reply("Welcome!");
  }
});

// Admin command
bot.command("admin", (ctx) => {
  if (ctx.chat.id != ADMIN_ID) return;

  sessions[ctx.chat.id] = "WAIT_PASS";
  ctx.reply("Enter admin password:");
});

// Validate password
bot.on("text", (ctx) => {
  if (sessions[ctx.chat.id] === "WAIT_PASS") {
    if (ctx.message.text === ADMIN_PASS) {
      sessions[ctx.chat.id] = "ADMIN";
      return ctx.reply("Admin login successful.");
    } else {
      return ctx.reply("Wrong password.");
    }
  }
});

// Upload command
bot.command("upload", (ctx) => {
  if (sessions[ctx.chat.id] !== "ADMIN") return;
  sessions[ctx.chat.id] = "WAIT_FILE";
  ctx.reply("Send your file:");
});

// Receive file
bot.on("document", async (ctx) => {
  if (sessions[ctx.chat.id] !== "WAIT_FILE") return;

  const fileId = ctx.message.document.file_id;
  const code = Math.random().toString(36).substring(2, 12);

  files[code] = fileId;
  sessions[ctx.chat.id] = "ADMIN";

  const link = `https://t.me/${ctx.me}?start=${code}`;
  ctx.reply(`URL generated:\n${link}`);
});

// ADS — text
bot.command("sendads", async (ctx) => {
  if (sessions[ctx.chat.id] !== "ADMIN") return;

  sessions[ctx.chat.id] = "WAIT_ADS_TEXT";
  ctx.reply("Send ads text:");
});

bot.on("text", (ctx) => {
  if (sessions[ctx.chat.id] === "WAIT_ADS_TEXT") {
    users.forEach((uid) => bot.telegram.sendMessage(uid, ctx.message.text));
    sessions[ctx.chat.id] = "ADMIN";
    ctx.reply("Ads sent to all users.");
  }
});

// Image ads
bot.command("sendimgads", (ctx) => {
  if (sessions[ctx.chat.id] !== "ADMIN") return;
  sessions[ctx.chat.id] = "WAIT_IMG_ADS";
  ctx.reply("Send image:");
});

bot.on("photo", async (ctx) => {
  if (sessions[ctx.chat.id] !== "WAIT_IMG_ADS") return;

  const fileId = ctx.message.photo.pop().file_id;

  users.forEach((uid) =>
    bot.telegram.sendPhoto(uid, fileId)
  );

  sessions[ctx.chat.id] = "ADMIN";
  ctx.reply("Image ads sent.");
});

// Video ads
bot.command("sendvidads", (ctx) => {
  if (sessions[ctx.chat.id] !== "ADMIN") return;
  sessions[ctx.chat.id] = "WAIT_VIDEO_ADS";
  ctx.reply("Send video:");
});

bot.on("video", async (ctx) => {
  if (sessions[ctx.chat.id] !== "WAIT_VIDEO_ADS") return;

  const vid = ctx.message.video.file_id;

  users.forEach((uid) =>
    bot.telegram.sendVideo(uid, vid)
  );

  sessions[ctx.chat.id] = "ADMIN";
  ctx.reply("Video ads sent.");
});

// Launch bot
bot.launch();
console.log("Bot running...");
