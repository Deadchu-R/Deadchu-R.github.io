// RenderingManager: draws the tile map to the console in color.
// Messages for the player are queued on an event and printed after the grid.
public class RenderingManager : IRendering
{
    public event Action OnPrint;

    public void DrawGrid()
    {
        Console.Clear();
        for (int y = 0; y < TileMap.Instance.Grid.GetLength(1); y++)
        {
            for (int x = 0; x < TileMap.Instance.Grid.GetLength(0); x++)
            {
                for (int i = 0; i < 3; i++)       // each tile is drawn as "[", its content, "]"
                {
                    Tile tile = TileMap.Instance.Grid[x, y];
                    Console.ForegroundColor = i == 1 && tile.gameObject != null
                        ? tile.gameObject.Color   // the piece's color
                        : tile.TileColor;         // the board's color
                    Console.Write(tile.TileContainer[i]);
                }
            }
            Console.WriteLine();
        }
        PrintToUser();
    }

    public void AddToPrint(string message) => OnPrint += () => Console.WriteLine(message);
    public void PrintToUser() => OnPrint?.Invoke();
    public void ClearPrint() => OnPrint = null;
}
