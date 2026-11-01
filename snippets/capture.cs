// ArmyCaptureManager.cs: stand inside a defeated army's circle until the countdown
// ends to take its soldiers; stepping out cancels the capture
public void SetCaptureCollider(Vector2 position, float radius = 1, bool active = false)
{
    _canCapture = true;
    _armyCommanderPosition = position;
    _captureCollider.transform.position = position;
    _captureCollider.radius = radius;
    _captureCollider.enabled = active;
}

private void Update()
{
    if (_captureCountdownTimer == null || !_captureCountdownTimer.IsRunning) return;
    _captureCountdownTimer.Tick(Time.deltaTime);   // timer ticked in Update, not a coroutine
    if (_captureCountdownTimer.IsFinished) Capture();
}

private void OnTriggerEnter2D(Collider2D collision)
{
    if (collision.CompareTag("Player")) StartCaptureTimer();
}

private void OnTriggerExit2D(Collider2D collision)
{
    if (collision.CompareTag("Player")) ResetCaptureCountdown();
}

private void Capture()
{
    GameManager.instance.PlayerController.CaptureArmy(_defeatedArmy.Soldiers);
    _defeatedArmy.Soldiers.Clear();
    _captureCountdownTimer.Reset();
}
