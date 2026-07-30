const videoCards = document.querySelectorAll("[data-video-card]");

videoCards.forEach((videoCard) => {
  const video = videoCard.querySelector("[data-video]");
  const toggleButton = videoCard.querySelector("[data-video-toggle]");

  if (!(video instanceof HTMLVideoElement)) {
    return;
  }

  if (!(toggleButton instanceof HTMLButtonElement)) {
    return;
  }

  /**
   * Synchronizes the visual control and accessible label with the
   * current playback state.
   *
   * @param {"initial" | "playing" | "paused"} state
   */
  const setVideoState = (state) => {
    const labels = {
      initial: "Reproduzir vídeo do procedimento facial",
      playing: "Pausar vídeo do procedimento facial",
      paused: "Continuar vídeo pausado do procedimento facial",
    };

    videoCard.dataset.videoState = state;
    toggleButton.setAttribute("aria-label", labels[state]);
  };

  /**
   * Restores the poster and initial control after playback ends.
   */
  const resetVideo = () => {
    video.load();
    setVideoState("initial");
  };

  /**
   * Starts, pauses or resumes playback through the dedicated button.
   */
  const togglePlayback = async () => {
    const isPlaying = !video.paused && !video.ended;

    if (isPlaying) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch (error) {
      const fallbackState = video.currentTime > 0
        ? "paused"
        : "initial";

      setVideoState(fallbackState);
      console.error("Unable to start video playback.", error);
    }
  };

  toggleButton.addEventListener("click", togglePlayback);

  /**
   * Direct interaction with the video is limited to pausing active
   * playback. Starting and resuming remain assigned to the button.
   */
  video.addEventListener("click", () => {
    const isPlaying = !video.paused && !video.ended;

    if (isPlaying) {
      video.pause();
    }
  });

  video.addEventListener("play", () => {
    setVideoState("playing");
  });

  video.addEventListener("pause", () => {
    if (video.ended) {
      return;
    }

    const state = video.currentTime > 0
      ? "paused"
      : "initial";

    setVideoState(state);
  });

  video.addEventListener("ended", resetVideo);

  video.addEventListener("emptied", () => {
    setVideoState("initial");
  });

  setVideoState("initial");
});
