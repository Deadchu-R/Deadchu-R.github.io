// UI_Manager.cs: one inspector slot per PanelEnum value, kept in sync automatically.
// Add a value to the enum and its slot appears; panels are then opened by enum.
private void OnValidate() => InitializePanelDictionary();

private void AdjustPanelEntriesSize()
{
    int enumCount = Enum.GetValues(typeof(PanelEnum)).Length;
    if (panelEntries.Count > enumCount)
        panelEntries.RemoveRange(enumCount, panelEntries.Count - enumCount);
    while (panelEntries.Count < enumCount)
        panelEntries.Add(new PanelEntry());
}

private void AssignPanelEnums()
{
    for (int i = 0; i < panelEntries.Count; i++)
        panelEntries[i].PanelEnum = (PanelEnum)Enum.ToObject(typeof(PanelEnum), i);
}

public void OpenPanel(PanelEnum panelID)
{
    GameObject panel = panels[panelID];
    if (panel != null && !panel.activeSelf) panel.SetActive(true);
}
