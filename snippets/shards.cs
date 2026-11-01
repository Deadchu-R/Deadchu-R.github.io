// Types the page out letter by letter and raises events other systems hook into:
// talking sounds and the speaker's mouth animation listen to onLetterTyped / onWordTyped.
private IEnumerator TypeText()
{
    if (_isCoroutineRunning)
    {
        Debug.LogWarning("Coroutine is already running.");
        yield break;
    }

    _isCoroutineRunning = true;
    _textBuilder.Length = 0;                  // reuse one StringBuilder, no per-letter strings
    int characterCount = _fullText.Length;

    for (int i = 0; i < characterCount; i++)
    {
        onLetterTyped?.Invoke();
        if (_fullText[i] == ' ')
            onWordTyped?.Invoke();

        _textBuilder.Append(_fullText[i]);
        textMeshProUGUI.text = _textBuilder.ToString();
        if (IsFinishedText()) yield break;      // raises onFinishedText

        for (int j = 0; j < (int)(typingSpeed * 60); j++)
            yield return _waitForEndOfFrame;      // cached, no allocation per frame
    }
}

// Each page type decides what happens when it is shown.
[CreateAssetMenu(fileName = "New Page", menuName = "Page/DialoguePage")]
public class DialoguePage : Page
{
    public string[] Options;
    public Page[] Pages;                          // where each answer leads

    public override void PageAction(SpeechBubbleUI speechBubbleUI)
    {
        speechBubbleUI.SetDialogueOptions(this);
        speechBubbleUI.SetButtonInteractable(speechBubbleUI.NextButton, false);
    }
}
