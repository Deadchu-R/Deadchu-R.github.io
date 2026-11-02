// Pile.cs: reshuffle the draw pile together with other piles (e.g. the discard pile)
public void Shuffle(Pile[] piles)
{
    List<CardData> combinedCards = new List<CardData>();

    foreach (CardData card in cardsData)          // this pile
        if (card != null) combinedCards.Add(card);

    foreach (Pile pile in piles)                   // every other pile
    {
        if (pile == null || pile == this) continue;
        foreach (var card in pile.GetPile())
            if (card != null) combinedCards.Add(card);
    }

    cardsData = combinedCards.ToArray();
    cardsInPile = cardsData.Length;
    ShuffleCardData();                             // swap-shuffle, then rebuild the Card objects
}
