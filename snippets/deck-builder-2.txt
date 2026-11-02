// Deck.cs: draw cards one by one into the hand; when the deck runs out,
// shuffle and keep drawing the cards that are still owed
public IEnumerator DrawCards(int cardsToDraw)
{
    int currentCardsToDraw = Mathf.Min(cardsToDraw, cardsInDeck);
    _remainingCardsToDraw = cardsToDraw;

    for (int cardIndex = 0; cardIndex < currentCardsToDraw; cardIndex++)
    {
        float cardPosition = cardIndex * (cardSpacer + 1);
        DrawCard(cardPosition, cardIndex);          // instantiate, then slide into the hand
        _remainingCardsToDraw--;
        yield return new WaitForSeconds(delayBetweenDraws);
    }

    if (cardsInDeck <= 0)
    {
        Shuffle();
        if (_remainingCardsToDraw > 0)
            StartCoroutine(DrawCards(_remainingCardsToDraw));
    }
}
