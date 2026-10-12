(function () {
  "use strict";

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const HUMAN = "X";
  const AI = "O";
  const STORAGE_KEY = "ttt-scores-v1";
  const AI_DELAY = 420;

  const state = {
    board: Array(9).fill(""),
    currentPlayer: HUMAN,
    gameOver: false,
    mode: "friend",
    aiThinking: false,
    scores: { x: 0, o: 0, ai: 0, ties: 0 },
  };

  const els = {
    board: document.getElementById("board"),
    cells: Array.from(document.querySelectorAll(".cell")),
    status: document.getElementById("status"),
    scoreX: document.getElementById("score-x"),
    scoreO: document.getElementById("score-o"),
    scoreAI: document.getElementById("score-ai"),
    scoreTies: document.getElementById("score-ties"),
    aiCard: document.getElementById("ai-card"),
    modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
    resetBoard: document.getElementById("reset-board"),
    resetScores: document.getElementById("reset-scores"),
  };

  function loadScores() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.scores = {
            x: Number(parsed.x) || 0,
            o: Number(parsed.o) || 0,
            ai: Number(parsed.ai) || 0,
            ties: Number(parsed.ties) || 0,
          };
        }
      }
    } catch (err) {
      /* ignore corrupted storage */
    }
  }

  function saveScores() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.scores));
    } catch (err) {
      /* storage unavailable */
    }
  }

  function renderScores() {
    els.scoreX.textContent = state.scores.x;
    els.scoreO.textContent = state.scores.o;
    els.scoreAI.textContent = state.scores.ai;
    els.scoreTies.textContent = state.scores.ties;
  }

  function renderBoard() {
    state.board.forEach((value, i) => {
      const cell = els.cells[i];
      const wasEmpty = !cell.textContent;
      cell.textContent = value;
      cell.classList.toggle("x", value === HUMAN);
      cell.classList.toggle("o", value === AI);
      cell.classList.toggle("filled", value !== "");
      cell.disabled = value !== "" || state.gameOver || state.aiThinking;
      if (value && wasEmpty) {
        cell.classList.remove("pop");
        void cell.offsetWidth;
        cell.classList.add("pop");
      }
    });
  }

  function setStatus(text, type) {
    els.status.textContent = text;
    els.status.classList.remove("win", "tie");
    if (type) els.status.classList.add(type);
  }

  function playerName(player) {
    if (player === AI) {
      return state.mode === "ai" ? "AI" : "Player O";
    }
    return "Player X";
  }

  function getWinner(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return null;
  }

  function getEmptyCells(board) {
    const cells = [];
    for (let i = 0; i < board.length; i++) {
      if (!board[i]) cells.push(i);
    }
    return cells;
  }

  function minimax(board, isMaximizing, depth) {
    const result = getWinner(board);
    if (result) {
      if (result.winner === AI) return { score: 10 - depth };
      return { score: depth - 10 };
    }
    const empty = getEmptyCells(board);
    if (empty.length === 0) return { score: 0 };

    if (isMaximizing) {
      let best = { score: -Infinity, index: -1 };
      for (const index of empty) {
        board[index] = AI;
        const { score } = minimax(board, false, depth + 1);
        board[index] = "";
        if (score > best.score) best = { score, index };
      }
      return best;
    }

    let best = { score: Infinity, index: -1 };
    for (const index of empty) {
      board[index] = HUMAN;
      const { score } = minimax(board, true, depth + 1);
      board[index] = "";
      if (score < best.score) best = { score, index };
    }
    return best;
  }

  function bestAIMove() {
    const empty = getEmptyCells(state.board);
    if (empty.length === 0) return -1;
    if (empty.length === 9) return 4;
    const copy = state.board.slice();
    const { index } = minimax(copy, true, 0);
    return index;
  }

  function highlightWin(line) {
    line.forEach((i) => els.cells[i].classList.add("win"));
    els.board.classList.add("win");
  }

  function endGame(result) {
    state.gameOver = true;
    state.aiThinking = false;
    renderBoard();

    if (result === "tie") {
      state.scores.ties += 1;
      setStatus("It's a tie!", "tie");
      els.board.classList.add("draw");
    } else {
      const { winner, line } = result;
      highlightWin(line);
      if (winner === HUMAN) {
        state.scores.x += 1;
      } else if (state.mode === "ai") {
        state.scores.ai += 1;
      } else {
        state.scores.o += 1;
      }
      setStatus(`${playerName(winner)} wins!`, "win");
    }

    saveScores();
    renderScores();
  }

  function checkGameEnd() {
    const result = getWinner(state.board);
    if (result) {
      endGame(result);
      return true;
    }
    if (getEmptyCells(state.board).length === 0) {
      endGame("tie");
      return true;
    }
    return false;
  }

  function switchTurn() {
    state.currentPlayer = state.currentPlayer === HUMAN ? AI : HUMAN;
    setStatus(`${playerName(state.currentPlayer)}'s turn`);
    if (state.mode === "ai" && state.currentPlayer === AI) {
      aiTurn();
    }
  }

  function placeMark(index) {
    if (state.board[index] || state.gameOver || state.aiThinking) return;
    state.board[index] = state.currentPlayer;
    renderBoard();
    if (checkGameEnd()) return;
    switchTurn();
  }

  function aiTurn() {
    state.aiThinking = true;
    renderBoard();
    setStatus("AI is thinking...");
    window.setTimeout(() => {
      const index = bestAIMove();
      state.aiThinking = false;
      if (index === -1 || state.gameOver) {
        renderBoard();
        return;
      }
      state.board[index] = AI;
      renderBoard();
      if (checkGameEnd()) return;
      state.currentPlayer = HUMAN;
      setStatus(`${playerName(HUMAN)}'s turn`);
    }, AI_DELAY);
  }

  function resetBoard() {
    state.board = Array(9).fill("");
    state.currentPlayer = HUMAN;
    state.gameOver = false;
    state.aiThinking = false;
    els.board.classList.remove("win", "draw");
    els.cells.forEach((cell) => cell.classList.remove("win", "pop"));
    renderBoard();
    setStatus(`${playerName(HUMAN)}'s turn`);
  }

  function resetScores() {
    state.scores = { x: 0, o: 0, ai: 0, ties: 0 };
    saveScores();
    renderScores();
  }

  function setMode(mode) {
    state.mode = mode;
    els.modeButtons.forEach((btn) => {
      const active = btn.dataset.mode === mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    els.aiCard.classList.toggle("hidden", mode !== "ai");
    resetBoard();
  }

  els.board.addEventListener("click", (event) => {
    const cell = event.target.closest(".cell");
    if (!cell) return;
    if (state.mode === "ai" && state.currentPlayer === AI) return;
    placeMark(Number(cell.dataset.index));
  });

  els.modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  els.resetBoard.addEventListener("click", resetBoard);
  els.resetScores.addEventListener("click", resetScores);

  loadScores();
  renderScores();
  resetBoard();
})();
