namespace AutoSudoku.Function.Optimisation.Models;

public record SudokuInput
{
    /// <summary>
    /// The unsolved sudoku puzzle, with known values and unknown values represented as nullable integers.
    /// Null = unknown value.
    /// Not null = known value.
    /// </summary>
    public required ushort?[][] KnownValues { get; set; }
}