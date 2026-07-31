/* Accessible mobile navigation */
const menuButton = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-navigation]");
const desktopNavigationQuery = window.matchMedia("(min-width: 64rem)");

if (
  menuButton instanceof HTMLButtonElement &&
  navigation instanceof HTMLElement
) {
  const setMenuState = (isOpen, { restoreFocus = false } = {}) => {
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen
        ? "Fechar menu de navegação"
        : "Abrir menu de navegação",
    );
    navigation.dataset.open = String(isOpen);

    if (restoreFocus) {
      menuButton.focus();
    }
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const selectedLink = event.target.closest("a");

    if (selectedLink instanceof HTMLAnchorElement) {
      setMenuState(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";

    if (event.key === "Escape" && isOpen) {
      setMenuState(false, { restoreFocus: true });
    }
  });

  desktopNavigationQuery.addEventListener("change", (event) => {
    if (event.matches) {
      setMenuState(false);
    }
  });
}

/* Back to top control */
const backToTopButton = document.querySelector("[data-back-to-top]");
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

if (backToTopButton instanceof HTMLButtonElement) {
  const updateBackToTopVisibility = () => {
    const shouldShow = window.scrollY > 400;

    backToTopButton.classList.toggle(
      "back-to-top--visible",
      shouldShow,
    );
  };

  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
    });
  });

  window.addEventListener("scroll", updateBackToTopVisibility, {
    passive: true,
  });

  updateBackToTopVisibility();
}

/* Custom inline video controls */
const videoCard = document.querySelector("[data-video-card]");
const video = videoCard?.querySelector("[data-video]");
const toggleButton = videoCard?.querySelector("[data-video-toggle]");

const stateLabels = {
  initial: "Reproduzir vídeo do procedimento de harmonização facial",
  playing: "Pausar vídeo do procedimento de harmonização facial",
  paused: "Continuar vídeo pausado do procedimento de harmonização facial",
};

const isPlaying = (media) => !media.paused && !media.ended;

const setVideoState = (state) => {
  if (!videoCard || !toggleButton) return;

  videoCard.dataset.videoState = state;
  toggleButton.setAttribute("aria-label", stateLabels[state]);
};

if (
  video instanceof HTMLVideoElement &&
  toggleButton instanceof HTMLButtonElement
) {
  toggleButton.addEventListener("click", async () => {
    if (isPlaying(video)) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch (error) {
      console.error("Unable to start video playback.", error);
    }
  });

  /* The video becomes the pause target while the overlay is hidden. */
  video.addEventListener("click", () => {
    if (isPlaying(video)) video.pause();
  });

  video.addEventListener("play", () => setVideoState("playing"));

  video.addEventListener("pause", () => {
    if (!video.ended) {
      setVideoState(video.currentTime > 0 ? "paused" : "initial");
    }
  });

  /* Reloading restores the poster after playback finishes. */
  video.addEventListener("ended", () => {
    video.load();
    setVideoState("initial");
  });
}

/* Shared image and video viewer */
const viewer = document.querySelector("[data-media-viewer]");
const viewerStage = viewer?.querySelector(".media-viewer__stage");
const viewerImage = viewer?.querySelector("[data-media-viewer-image]");
const viewerCaption = viewer?.querySelector("[data-media-viewer-caption]");
const viewerCloseButton = viewer?.querySelector("[data-media-viewer-close]");

if (
  viewer instanceof HTMLDialogElement &&
  viewerStage instanceof HTMLElement &&
  viewerImage instanceof HTMLImageElement &&
  viewerCaption instanceof HTMLElement &&
  viewerCloseButton instanceof HTMLButtonElement
) {
  let activeTrigger = null;
  let restoreFocus = false;
  let videoParent = null;
  let videoNextSibling = null;
  let videoPlaceholder = null;

  const rememberTrigger = (trigger, event) => {
    activeTrigger = trigger;
    restoreFocus = event.detail === 0;
  };

  const openImage = (trigger, event) => {
    if (viewer.open) return;

    const figure = trigger.closest("figure");
    const sourceImage = figure?.querySelector(
      ".practice-card__asset--photo, .result-card__image",
    );

    if (!(sourceImage instanceof HTMLImageElement)) return;

    rememberTrigger(trigger, event);
    viewer.dataset.mediaType = "image";
    viewerImage.hidden = false;
    viewerImage.src = sourceImage.src;
    viewerImage.alt = sourceImage.alt;
    viewerCaption.textContent =
      figure.querySelector("figcaption h4")?.textContent?.trim() ||
      "Imagem ampliada";

    viewer.showModal();
  };

  const openVideo = (trigger, event) => {
    if (
      viewer.open ||
      !(videoCard instanceof HTMLElement) ||
      !(video instanceof HTMLVideoElement)
    ) {
      return;
    }

    /*
     * Moving the existing player preserves playback time,
     * volume and the current custom-control state.
     */
    rememberTrigger(trigger, event);
    videoParent = videoCard.parentNode;
    videoNextSibling = videoCard.nextSibling;

    videoPlaceholder = document.createElement("div");
    videoPlaceholder.className =
      "practice-card__media practice-card__media--video";
    videoPlaceholder.style.backgroundImage = `url("${video.poster}")`;
    videoPlaceholder.style.backgroundPosition = "center";
    videoPlaceholder.style.backgroundSize = "cover";
    videoPlaceholder.setAttribute("aria-hidden", "true");

    videoParent.insertBefore(videoPlaceholder, videoCard);

    viewer.dataset.mediaType = "video";
    viewerImage.hidden = true;

    trigger.setAttribute(
      "aria-label",
      "Retornar vídeo ao tamanho normal",
    );

    viewerStage.append(videoCard);
    viewer.showModal();
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const imageTrigger = event.target.closest("[data-expand-image]");
    const videoTrigger = event.target.closest("[data-expand-video]");

    if (imageTrigger instanceof HTMLButtonElement) {
      openImage(imageTrigger, event);
      return;
    }

    if (videoTrigger instanceof HTMLButtonElement) {
      if (viewer.open && viewer.dataset.mediaType === "video") {
        viewer.close();
      } else {
        openVideo(videoTrigger, event);
      }
    }
  });

  viewerCloseButton.addEventListener("click", () => {
    viewer.close();
  });

  /* Native dialog handles Escape; this adds backdrop closing. */
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) {
      viewer.close();
    }
  });

  viewer.addEventListener("close", () => {
    if (
      viewer.dataset.mediaType === "video" &&
      videoCard instanceof HTMLElement &&
      videoParent
    ) {
      /*
       * Playback is intentionally preserved when the player returns
       * to its original card.
       */
      if (videoNextSibling && videoNextSibling.parentNode === videoParent) {
        videoParent.insertBefore(videoCard, videoNextSibling);
      } else {
        videoParent.append(videoCard);
      }

      videoPlaceholder?.remove();

      const videoExpandButton = videoCard.querySelector(
        "[data-expand-video]",
      );

      videoExpandButton?.setAttribute(
        "aria-label",
        "Ampliar vídeo do procedimento de harmonização facial",
      );
    }

    viewerImage.hidden = true;
    viewer.dataset.mediaType = "";

    if (activeTrigger) {
      restoreFocus ? activeTrigger.focus() : activeTrigger.blur();
    }

    activeTrigger = null;
    restoreFocus = false;
    videoParent = null;
    videoNextSibling = null;
    videoPlaceholder = null;
  });
}
