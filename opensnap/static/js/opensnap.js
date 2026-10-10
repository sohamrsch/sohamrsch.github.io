const QUERIES = [
  ["rug", "q0_rug"], ["vase", "q1_vase"], ["sideboard", "q2_sideboard"], ["pouf", "q3_pouf"],
  ["painting", "q4_painting"], ["wicker chair", "q5_wicker_chair"], ["throw blanket", "q6_throw_blanket"],
  ["floor lamp", "q7_floor_lamp"], ["flower", "q8_flower"], ["side table", "q9_side_table"],
];

const CLICKS = {
  "5": [
    ["Indoor crops", "S3DIS", 73.1, 81.8], ["Indoor rooms", "S3DIS", 69.0, 78.5], ["Synthetic rooms", "Replica", 59.5, 74.8],
    ["Outdoor LiDAR", "nuScenes", 63.8, 73.4], ["Outdoor LiDAR", "SemanticKITTI", 67.6, 71.9],
  ],
  "10": [
    ["Indoor crops", "S3DIS", 74.6, 88.8], ["Indoor rooms", "S3DIS", 70.5, 84.7], ["Synthetic rooms", "Replica", 60.1, 81.9],
    ["Outdoor LiDAR", "nuScenes", 65.4, 79.2], ["Outdoor LiDAR", "SemanticKITTI", 70.4, 76.9],
  ],
};

function show(src, text) {
  document.getElementById("stage-img").src = "./static/images/query/room0_" + src + ".jpg";
  document.getElementById("readout").textContent = text;
}

function buildExplorer() {
  const q = document.getElementById("chips-query");
  const c = document.getElementById("chips-click");
  if (!q) return;
  const all = [];
  const add = (box, label, src, text, cls) => {
    const b = document.createElement("button");
    b.className = "os-chip " + (cls || "");
    b.textContent = label;
    b.onclick = () => { all.forEach(x => x.classList.remove("is-active")); b.classList.add("is-active"); show(src, text); };
    box.appendChild(b);
    all.push(b);
    return b;
  };
  QUERIES.forEach(([w, s]) => add(q, w, s, `SELECT WHERE IS('${w}')  -- ranked by P(${w} | o)`));
  for (let i = 0; i < 8; i++) add(c, "click " + (i + 1), "1_select_" + i, "click → mask (frozen segmenter) + name (3D-propose / VLM-choose)", "is-click");
  all[1].click();
}

function drawBars(k) {
  const box = document.getElementById("bars");
  if (!box) return;
  box.innerHTML = "";
  CLICKS[k].forEach(([name, ds, base, ours]) => {
    const row = document.createElement("div");
    row.className = "os-bar-row";
    row.innerHTML = `<div class="lbl">${ds}<small>${name}</small></div>
      <div class="os-track"><div class="os-fill base">${base.toFixed(1)}</div><div class="os-fill ours">${ours.toFixed(1)}</div></div>`;
    box.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      row.querySelector(".base").style.width = base + "%";
      row.querySelector(".ours").style.width = ours + "%";
    }));
  });
  document.querySelectorAll("#bar-toggle button").forEach(b => b.classList.toggle("is-active", b.dataset.k === k));
}

function copyBib() {
  const t = document.getElementById("bibtex-text").textContent;
  navigator.clipboard.writeText(t).then(() => {
    const b = document.getElementById("copy-btn");
    b.textContent = "copied";
    setTimeout(() => (b.textContent = "copy"), 1500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  buildExplorer();
  drawBars("5");
  document.querySelectorAll("#bar-toggle button").forEach(b => (b.onclick = () => drawBars(b.dataset.k)));

  if (window.bulmaCarousel) {
    bulmaCarousel.attach(".carousel", { slidesToScroll: 1, slidesToShow: 1, loop: true, infinite: true, autoplay: true, autoplaySpeed: 5000, pauseOnHover: true });
  }

  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
});
