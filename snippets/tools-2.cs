// Quest.cs + QuestManager.cs: quests are ScriptableObjects chained through NextQuest.
// Finishing one strikes it out on screen and shows the next.
[CreateAssetMenu(fileName = "New Quest", menuName = "Quests/defaultQuest")]
public class Quest : ScriptableObject
{
    public string questName;
    public string QuestDescription;
    public int QuestID;
    public Quest NextQuest;
    public bool IsCompleted = false;
}

public void FinishedQuest(Quest quest)
{
    if (quest.NextQuest != null)
    {
        _previousQuest = quest;
        _currentQuest = quest.NextQuest;
        questText.text = _previousQuest.QuestDescription;
        questText2.text = _currentQuest.QuestDescription;
        questText.fontStyle = FontStyles.Strikethrough;   // the finished quest, struck out
    }
}
