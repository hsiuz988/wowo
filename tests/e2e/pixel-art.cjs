// 測像素畫風（舊房間：像素女孩的表情、生活印記家具、電視、配色）的測試用：開機前先切到像素畫風
// 預設是塗鴉畫風（public/doodle.css、room.js 的 DOODLE），塗鴉房間的測試在 doodle.test.cjs
module.exports = (p) => p.addInitScript(() => { try { localStorage.setItem('lifey.art', 'pixel'); } catch (e) { /* 存不了就照預設 */ } });
