const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const numbers = ["0", "00", ...Array.from({ length: 36 }, (_, index) => String(index + 1))];
const spins = [];

const markets = {
  range: {
    sides: ["1-18", "19-36"],
    classify: (n) => n >= 1 && n <= 18 ? "1-18" : n >= 19 && n <= 36 ? "19-36" : "Zero",
  },
  parity: {
    sides: ["Even", "Odd"],
    classify: (n) => n >= 1 && n <= 36 ? (n % 2 === 0 ? "Even" : "Odd") : "Zero",
  },
  color: {
    sides: ["Black", "Red"],
    classify: (n, label) => label === "0" || label === "00" ? "Zero" : RED_NUMBERS.has(n) ? "Red" : "Black",
  },
};

const wheelType = document.querySelector("#wheelType");
const baseBet = document.querySelector("#baseBet");
const triggerStreak = document.querySelector("#triggerStreak");
const numberGrid = document.querySelector("#numberGrid");
const history = document.querySelector("#history");
const spinCount = document.querySelector("#spinCount");

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseSpin(label) {
  return {
    label,
    value: label === "00" ? 37 : Number(label),
    color: getColor(label),
  };
}

function getColor(label) {
  if (label === "0" || label === "00") return "green";
  return RED_NUMBERS.has(Number(label)) ? "red" : "black";
}

function allowedPocketCount() {
  return wheelType.value === "american" ? 38 : 37;
}

function formatOdds() {
  const pockets = allowedPocketCount();
  const wins = 18;
  const losses = pockets - wins;
  const winPercent = (wins / pockets * 100).toFixed(2);
  const lossPercent = (losses / pockets * 100).toFixed(2);

  return `${wins}/${pockets} = ${winPercent}% | miss ${lossPercent}%`;
}

function hitProbability() {
  return 18 / allowedPocketCount();
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  if (value > 0 && value < 0.0001) return "<0.01%";
  return `${(value * 100).toFixed(2)}%`;
}

function updateNumberAvailability() {
  document.querySelector('[data-number="00"]').classList.toggle("hidden", wheelType.value !== "american");
}

function sideStreak(market) {
  let side = null;
  let length = 0;

  for (let i = spins.length - 1; i >= 0; i -= 1) {
    const spin = spins[i];
    const classified = market.classify(spin.value, spin.label);

    if (!market.sides.includes(classified)) {
      break;
    }

    if (side === null) {
      side = classified;
      length = 1;
      continue;
    }

    if (classified !== side) {
      break;
    }

    length += 1;
  }

  return { side, length };
}

function marketRecommendation(market) {
  const trigger = Math.max(1, Number(triggerStreak.value) || 3);
  const base = Math.max(1, Number(baseBet.value) || 5);
  const streak = sideStreak(market);
  const oddsText = formatOdds();
  const targetOdds = streak.length > 0 ? formatPercent(1 - hitProbability() ** streak.length) : "-";

  if (!streak.side || streak.length < trigger) {
    return {
      streakText: streak.side ? `${streak.side} x${streak.length}` : "None",
      targetOdds,
      target: "-",
      bet: "Wait",
      risk: "$0",
      oddsText,
    };
  }

  const target = market.sides.find((side) => side !== streak.side);
  const step = streak.length - trigger;
  const stake = base * 2 ** step;
  const bankrollAtRisk = base * (2 ** (step + 1) - 1);

  return {
    streakText: `${streak.side} x${streak.length}`,
    targetOdds,
    target,
    bet: money(stake),
    risk: money(bankrollAtRisk),
    oddsText,
  };
}

function renderCards() {
  Object.entries(markets).forEach(([key, market]) => {
    const card = document.querySelector(`[data-market="${key}"]`);
    const recommendation = marketRecommendation(market);
    card.querySelector('[data-field="streak"]').textContent = recommendation.streakText;
    card.querySelector('[data-field="targetOdds"]').textContent = recommendation.targetOdds;
    card.querySelector('[data-field="target"]').textContent = recommendation.target;
    card.querySelector('[data-field="bet"]').textContent = recommendation.bet;
    card.querySelector('[data-field="risk"]').textContent = recommendation.risk;
    card.querySelector('[data-field="odds"]').textContent = recommendation.oddsText;
  });
}

function renderHistory() {
  spinCount.textContent = `${spins.length} ${spins.length === 1 ? "spin" : "spins"}`;

  if (spins.length === 0) {
    history.className = "history empty";
    history.textContent = "No spins yet";
    return;
  }

  history.className = "history";
  history.replaceChildren(...spins.slice().reverse().map((spin) => {
    const chip = document.createElement("span");
    chip.className = `chip ${spin.color}`;
    chip.textContent = spin.label;
    return chip;
  }));
}

function render() {
  updateNumberAvailability();
  renderCards();
  renderHistory();
}

function addSpin(label) {
  if (label === "00" && wheelType.value !== "american") return;
  spins.push(parseSpin(label));
  render();
}

function buildNumberGrid() {
  numbers.forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-btn ${getColor(label)}`;
    button.dataset.number = label;
    button.textContent = label;
    button.addEventListener("click", () => addSpin(label));
    numberGrid.append(button);
  });
}

document.querySelector("#undoBtn").addEventListener("click", () => {
  spins.pop();
  render();
});

document.querySelector("#clearBtn").addEventListener("click", () => {
  spins.length = 0;
  render();
});

[wheelType, baseBet, triggerStreak].forEach((input) => {
  input.addEventListener("input", render);
});

wheelType.addEventListener("change", () => {
  if (wheelType.value !== "american") {
    for (let i = spins.length - 1; i >= 0; i -= 1) {
      if (spins[i].label === "00") spins.splice(i, 1);
    }
  }
  render();
});

buildNumberGrid();
render();
