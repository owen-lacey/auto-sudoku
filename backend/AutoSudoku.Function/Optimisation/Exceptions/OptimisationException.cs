namespace AutoSudoku.Function.Optimisation.Exceptions;

/// <summary>
/// Exception to be thrown for handles optimisation-related exceptions
/// </summary>
public class OptimisationException : Exception
{
    private OptimisationException(string message) : base(message)
    {
    }

    public static OptimisationException NoSolution()=>
        new ("No solution was found.");
}