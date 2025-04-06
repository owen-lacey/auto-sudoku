using AutoSudoku.Function.Optimisation;
using AutoSudoku.Function.Optimisation.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace AutoSudoku.Function.Triggers;

public class SolveSudokuTrigger
{
    [Function("solve")]
    public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
    {
        var requestBody = await req.ReadFromJsonAsync<ushort?[][]>();
        var input = new SudokuInput { KnownValues = requestBody! };
        var solver = new SudokuSolver(input);

        return new OkObjectResult(solver.Solve());
    }
}