type StartScreenProps = {
  onStart: () => void;
  busy: boolean;
  error: string | null;
};

export function StartScreen({ onStart, busy, error }: StartScreenProps) {
  return (
    <main className="start-screen" data-testid="screen-start">
      <section className="start-shell" aria-labelledby="start-title">
        <div className="start-kicker">an instrument for presence</div>
        <h1 className="start-title" id="start-title">
          DIGITAL <em>DISTORTION</em>
        </h1>
        <p className="start-description">
          Raise both hands to open a live window through the image. Your fingertips shape the signal.
        </p>
        {error ? <p className="start-error" role="alert" data-testid="status-camera-error">{error}</p> : null}
        <div className="start-footer">
          <button
            className="start-button"
            type="button"
            onClick={onStart}
            disabled={busy}
            data-testid="button-start-camera"
          >
            <span>{busy ? 'OPENING LENS' : 'START CAMERA'}</span>
            <span className="start-button-mark" aria-hidden="true">↗</span>
          </button>
          <p className="start-note">camera permission is requested only when you begin<br />best experienced full screen</p>
        </div>
      </section>
    </main>
  );
}
