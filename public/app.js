"use strict";
const $ = id => document.getElementById(id);
const audio = $("audio");
const MAX_TEXT = 20000, CHUNK = 1000;
let controller = null, objectURL = null, busy = false;

function message(text, kind = "") {
  $("status").textContent = text;
  $("status").className = kind;
}
function saveDraft() {
  try { localStorage.setItem("uk-voice-draft-v1", JSON.stringify({text: $("text").value,
    voice: document.querySelector('input[name=voice]:checked').value, rate: $("rate").value, pitch: $("pitch").value})); } catch (_) {}
}
function updateInputs() {
  $("count").textContent = `${$("text").value.length.toLocaleString("vi-VN")} / 20.000`;
  for (const id of ["rate", "pitch"]) {
    const n = Number($(id).value);
    $(`${id}-value`).textContent = `${n > 0 ? "+" : ""}${n}${id === "rate" ? "%" : " Hz"}`;
  }
  $("generate").disabled = busy || !$("text").value.trim();
}
function splitText(text, limit = CHUNK) {
  // Prefer sentence/paragraph boundaries; preserve every non-whitespace character.
  const parts = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit + 1);
    const boundaries = [...window.matchAll(/[.!?]["'’”)]*\s+|\n+/g)];
    let cut = 0;
    for (const m of boundaries) {
      const end = m.index + m[0].length;
      if (end >= limit * 0.45 && end <= limit) cut = end;
    }
    if (!cut) cut = window.lastIndexOf(" ", limit);
    if (cut < limit * 0.35) cut = limit;
    // Avoid splitting UTF-16 surrogate pairs.
    const code = rest.charCodeAt(cut - 1);
    if (code >= 0xD800 && code <= 0xDBFF) cut--;
    const piece = rest.slice(0, cut).trim();
    if (piece) parts.push(piece);
    rest = rest.slice(cut).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}
function setBusy(value) {
  busy = value;
  $("inputs").disabled = value;
  $("cancel").hidden = !value;
  $("progress").hidden = !value;
  $("studio").setAttribute("aria-busy", String(value));
  $("generate").textContent = value ? "Đang tạo…" : "Tạo giọng đọc";
  updateInputs();
}
function abortableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, {once:true});
    if (signal.aborted) abort();
  });
}
async function requestAudio(payload, signal) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const child = new AbortController();
    const cancel = () => child.abort();
    signal.addEventListener("abort", cancel, {once:true});
    if (signal.aborted) child.abort();
    const timer = setTimeout(() => child.abort(), 65000);
    try {
      const response = await fetch("/api/tts", {method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload), signal:child.signal, cache:"no-store"});
      if (!response.ok) {
        let error = "";
        try { error = (await response.json()).error || ""; } catch (_) {}
        if ([502,503,504].includes(response.status) && attempt === 0) {
          clearTimeout(timer);
          await abortableDelay(1800, signal);
          continue;
        }
        if (response.status === 404) error = "Không tìm thấy API tạo âm thanh. Hãy triển khai toàn bộ dự án lên Vercel, gồm thư mục api.";
        throw new Error(error || `Không tạo được âm thanh (HTTP ${response.status}). Hãy thử lại.`);
      }
      if (!(response.headers.get("Content-Type") || "").includes("audio/mpeg"))
        throw new Error("Máy chủ trả về dữ liệu không phải MP3. Kiểm tra cấu hình triển khai.");
      const blob = await response.blob();
      if (blob.size < 100) throw new Error("Âm thanh trả về trống. Hãy thử lại.");
      return blob;
    } catch (error) {
      if (error.name === "AbortError" && !signal.aborted) throw new Error("Yêu cầu quá thời gian chờ. Hãy thử lại với văn bản ngắn hơn.");
      if (error instanceof TypeError) throw new Error("Mất kết nối mạng. Kiểm tra Internet rồi thử lại.");
      throw error;
    } finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
  }
}
$("studio").addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  if (location.protocol === "file:") return message("Hãy mở đường link Vercel để tạo và tải MP3.", "error");
  const text = $("text").value.trim();
  if (!text) return message("Hãy nhập văn bản tiếng Anh.", "error");
  if (text.length > MAX_TEXT) return message("Văn bản tối đa 20.000 ký tự.", "error");
  const voice = document.querySelector('input[name=voice]:checked').value;
  const rate = Number($("rate").value), pitch = Number($("pitch").value);
  const parts = splitText(text), chunks = [];
  controller = new AbortController();
  const signal = controller.signal;
  audio.pause();
  saveDraft(); setBusy(true);
  $("progress").max = parts.length; $("progress").value = 0;
  try {
    for (let i = 0; i < parts.length; i++) {
      message(`Đang tạo âm thanh${parts.length > 1 ? ` · đoạn ${i+1}/${parts.length}` : ""}…`);
      chunks.push(await requestAudio({text:parts[i], voice, rate, pitch}, signal));
      $("progress").value = i + 1;
    }
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    // Edge TTS returns matching constant-bitrate MP3 frame streams, without container headers.
    // Concatenate frames into one complete downloadable MP3; do not save partial failures.
    const blob = new Blob(chunks, {type:"audio/mpeg"});
    const previous = objectURL;
    objectURL = URL.createObjectURL(blob);
    audio.src = objectURL; audio.load();
    if (previous) URL.revokeObjectURL(previous);
    const name = voice.replace("en-GB-", "").replace("Neural", "");
    $("download").href = objectURL;
    $("download").download = `UK-${name}-${new Date().toISOString().slice(0,10)}.mp3`;
    $("audio-info").textContent = `${name} · ${(blob.size / 1024).toFixed(0)} KB`;
    $("seek").value = 0; $("current").textContent = "0:00";
    $("player").hidden = false;
    message("Đã tạo xong. Nhấn phát để nghe hoặc tải MP3.", "success");
  } catch (error) {
    if (signal.aborted || error.name === "AbortError") message("Đã hủy tạo âm thanh.");
    else message(error.message || "Không tạo được âm thanh. Hãy thử lại.", "error");
  } finally { controller = null; setBusy(false); }
});
$("cancel").onclick = () => controller?.abort();
$("text").addEventListener("input", () => { updateInputs(); saveDraft(); });
for (const id of ["rate", "pitch"]) $(id).addEventListener("input", () => {updateInputs(); saveDraft();});
document.querySelectorAll('input[name=voice]').forEach(el => el.addEventListener("change", saveDraft));
$("reset").onclick = () => {$("rate").value = "0"; $("pitch").value = "0"; updateInputs(); saveDraft();};
$("clear").onclick = () => {$("text").value = ""; updateInputs(); saveDraft(); $("text").focus();};
$("import").onclick = () => $("file").click();
$("file").onchange = async () => {
  const file = $("file").files[0];
  if (!file) return;
  try {
    if (file.size > 200000) throw new Error("File TXT quá lớn. Giới hạn văn bản là 20.000 ký tự.");
    const content = (await file.text()).replace(/^\uFEFF/, "");
    if (content.length > MAX_TEXT) throw new Error("File vượt 20.000 ký tự. Hãy chia thành các file nhỏ hơn.");
    if (busy) return;
    $("text").value = content; updateInputs(); saveDraft(); message(`Đã nhập ${file.name}.`);
  } catch (error) { message(error.message, "error"); }
  finally { $("file").value = ""; }
};
function clock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function updateTime() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  $("seek").max = duration || 1;
  $("seek").disabled = !duration;
  $("seek").value = audio.currentTime || 0;
  $("seek").setAttribute("aria-valuetext", `${clock(audio.currentTime)} / ${clock(duration)}`);
  $("current").textContent = clock(audio.currentTime);
  $("duration").textContent = clock(duration);
}
async function playAudio() {
  try { await audio.play(); } catch (_) { message("Trình duyệt chưa phát được âm thanh. Hãy nhấn phát lại hoặc tải MP3.", "error"); }
}
$("play").onclick = () => audio.paused ? playAudio() : audio.pause();
$("restart").onclick = () => {audio.currentTime = 0; playAudio();};
function skip(seconds) {
  if (Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
}
$("back").onclick = () => skip(-10);
$("forward").onclick = () => skip(10);
$("seek").oninput = () => {if (Number.isFinite(audio.duration)) audio.currentTime = Number($("seek").value);};
$("volume").oninput = () => {audio.volume = Number($("volume").value);};
$("speed").onchange = () => {audio.playbackRate = Number($("speed").value);};
$("loop").onclick = () => {audio.loop = !audio.loop; $("loop").setAttribute("aria-pressed", String(audio.loop));};
audio.addEventListener("play", () => {$("play").textContent = "Ⅱ"; $("play").setAttribute("aria-label", "Tạm dừng");});
for (const event of ["pause", "ended"]) audio.addEventListener(event, () => {$("play").textContent = "▶"; $("play").setAttribute("aria-label", "Phát âm thanh");});
for (const event of ["loadedmetadata", "durationchange", "timeupdate", "seeked"]) audio.addEventListener(event, updateTime);
audio.addEventListener("error", () => message("Trình duyệt không đọc được âm thanh. Hãy thử tải file MP3 để mở bằng trình phát khác.", "error"));
// Some mobile browsers reset playbackRate on a new source.
audio.addEventListener("loadedmetadata", () => {audio.playbackRate = Number($("speed").value);});
window.addEventListener("beforeunload", () => {controller?.abort(); if (objectURL) URL.revokeObjectURL(objectURL);});
try {
  const draft = JSON.parse(localStorage.getItem("uk-voice-draft-v1") || "null");
  if (draft && typeof draft.text === "string") {
    $("text").value = draft.text.slice(0, MAX_TEXT);
    const radio = [...document.querySelectorAll('input[name=voice]')].find(el => el.value === draft.voice);
    if (radio) radio.checked = true;
    for (const id of ["rate", "pitch"]) if (Number.isFinite(Number(draft[id]))) $(id).value = String(Math.max(-50, Math.min(50, Number(draft[id]))));
  }
} catch (_) {}
updateInputs(); updateTime();
