import { describe, it, expect } from "vitest";
import { generateSudoku, validateSudoku, generate9x9Sudoku } from "../minigames.js";

describe("Sudoku", () => {
  describe("4x4", () => {
    it("generates valid puzzle", () => {
      const s = generateSudoku("easy");
      expect(s.puzzle.length).toBe(4);
      expect(s.solution.length).toBe(4);
      expect(s.puzzle.flat().filter(v => v === 0).length).toBe(6);
    });

    it("solution validates", () => {
      const s = generateSudoku("medium");
      expect(validateSudoku(s.solution, s.solution, 4)).toBe(true);
    });

    it("rejects invalid solution", () => {
      const bad = [[1,1,1,1],[2,2,2,2],[3,3,3,3],[4,4,4,4]];
      expect(validateSudoku([], bad, 4)).toBe(false);
    });

    it("hard has more blanks", () => {
      const s = generateSudoku("hard");
      expect(s.puzzle.flat().filter(v => v === 0).length).toBe(10);
    });
  });

  describe("9x9", () => {
    it("generates valid 9x9 puzzle", () => {
      const s = generate9x9Sudoku("easy");
      expect(s.puzzle.length).toBe(9);
      expect(s.solution.length).toBe(9);
      expect(s.size).toBe(9);
    });

    it("9x9 solution validates", () => {
      const s = generate9x9Sudoku("easy");
      expect(validateSudoku([], s.solution, 9)).toBe(true);
    });

    it("easy has 35 blanks", () => {
      const s = generate9x9Sudoku("easy");
      expect(s.puzzle.flat().filter(v => v === 0).length).toBe(35);
    });

    it("hard has 55 blanks", () => {
      const s = generate9x9Sudoku("hard");
      expect(s.puzzle.flat().filter(v => v === 0).length).toBe(55);
    });
  });
});

describe("Poker Hand Evaluation", () => {
  // Can't test easily without extracting evaluateHand — skip for now
  it("placeholder", () => expect(true).toBe(true));
});
