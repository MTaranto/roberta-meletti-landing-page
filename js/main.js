const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

function initMenu() {
  const button = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-navigation]");

  if (
    !(button instanceof HTMLButtonElement) ||
    !(navigation instanceof HTMLElement)
  ) {
    return;
  }

  function setOpen(isOpen, restoreFocus = false) {
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute(
      "aria-label",
      isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação",
    );
    navigation.dataset.open = String(isOpen);

    if (restoreFocus) button.focus();
  }

  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest("a") instanceof HTMLAnchorElement
    ) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      button.getAttribute("aria-expanded") === "true"
    ) {
      setOpen(false, true);
    }
  });

  window.matchMedia("(min-width: 64rem)").addEventListener(
    "change",
    (event) => {
      if (event.matches) setOpen(false);
    },
  );
}

function initBackToTop() {
  const button = document.querySelector("[data-back-to-top]");

  if (!(button instanceof HTMLButtonElement)) return;

  function updateVisibility() {
    button.classList.toggle("back-to-top--visible", window.scrollY > 400);
  }

  button.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
    });
  });
  window.addEventListener("scroll", updateVisibility, { passive: true });
  updateVisibility();
}

function initFaq() {
  const entries = Array.from(document.querySelectorAll(".faq-item"))
    .map((item) => ({
      item,
      summary: item.querySelector("summary"),
      answer: item.querySelector(".faq-item__answer"),
      // The native open flag stays true while closing, so track intent separately.
      targetOpen: item.open,
      heightAnimation: null,
      answerAnimation: null,
    }))
    .filter(
      ({ item, summary, answer }) =>
        item instanceof HTMLDetailsElement &&
        summary instanceof HTMLElement &&
        answer instanceof HTMLElement,
    );

  function animateEntry(entry, shouldOpen) {
    const { item, summary, answer } = entry;
    // Capture the rendered height first so rapid toggles reverse without jumping.
    const startHeight = item.getBoundingClientRect().height;

    entry.heightAnimation?.cancel();
    entry.answerAnimation?.cancel();
    entry.targetOpen = shouldOpen;
    item.style.removeProperty("height");

    if (shouldOpen) item.open = true;

    if (
      reducedMotionQuery.matches ||
      typeof item.animate !== "function"
    ) {
      item.open = shouldOpen;
      delete item.dataset.faqAnimating;
      entry.heightAnimation = null;
      entry.answerAnimation = null;
      return;
    }

    const endHeight =
      summary.offsetHeight + (shouldOpen ? answer.offsetHeight : 0);

    item.dataset.faqAnimating = "true";
    item.style.height = `${startHeight}px`;

    const heightAnimation = item.animate(
      [
        { height: `${startHeight}px` },
        { height: `${endHeight}px` },
      ],
      {
        duration: 260,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
    );
    const answerAnimation = answer.animate(
      [
        {
          opacity: shouldOpen ? 0 : 1,
          transform: shouldOpen
            ? "translateY(-0.3rem)"
            : "translateY(0)",
        },
        {
          opacity: shouldOpen ? 1 : 0,
          transform: shouldOpen
            ? "translateY(0)"
            : "translateY(-0.25rem)",
        },
      ],
      {
        duration: shouldOpen ? 220 : 170,
        easing: "ease",
        fill: "both",
      },
    );

    entry.heightAnimation = heightAnimation;
    entry.answerAnimation = answerAnimation;

    heightAnimation.addEventListener(
      "finish",
      () => {
        // Only the latest animation may commit state after a rapid reversal.
        if (entry.heightAnimation !== heightAnimation) return;

        item.open = shouldOpen;
        item.style.removeProperty("height");
        delete item.dataset.faqAnimating;
        answerAnimation.cancel();
        entry.heightAnimation = null;
        entry.answerAnimation = null;
      },
      { once: true },
    );
  }

  entries.forEach((entry) => {
    entry.summary.addEventListener("click", (event) => {
      event.preventDefault();

      const shouldOpen = !entry.targetOpen;

      if (shouldOpen) {
        entries.forEach((otherEntry) => {
          if (otherEntry !== entry && otherEntry.targetOpen) {
            animateEntry(otherEntry, false);
          }
        });
      }

      animateEntry(entry, shouldOpen);
    });
  });
}

const VIDEO_LABELS = {
  initial: "Reproduzir vídeo do procedimento de harmonização facial",
  playing: "Pausar vídeo do procedimento de harmonização facial",
  paused: "Continuar vídeo pausado do procedimento de harmonização facial",
};

function initVideo() {
  const card = document.querySelector("[data-video-card]");
  const video = card?.querySelector("[data-video]");
  const toggleButton = card?.querySelector("[data-video-toggle]");

  if (
    !(card instanceof HTMLElement) ||
    !(video instanceof HTMLVideoElement) ||
    !(toggleButton instanceof HTMLButtonElement)
  ) {
    return null;
  }

  function isPlaying() {
    return !video.paused && !video.ended;
  }

  function setState(state) {
    card.dataset.videoState = state;
    toggleButton.setAttribute("aria-label", VIDEO_LABELS[state]);
  }

  toggleButton.addEventListener("click", async () => {
    if (isPlaying()) {
      video.pause();
      return;
    }

    try {
      await video.play();
    } catch (error) {
      console.error("Unable to start video playback.", error);
    }
  });

  video.addEventListener("click", () => {
    if (isPlaying()) video.pause();
  });
  video.addEventListener("play", () => setState("playing"));
  video.addEventListener("pause", () => {
    if (!video.ended) setState(video.currentTime > 0 ? "paused" : "initial");
  });
  video.addEventListener("ended", () => {
    video.load();
    setState("initial");
  });

  return { card, video };
}

function initMediaViewer(player) {
  const viewer = document.querySelector("[data-media-viewer]");
  const stage = viewer?.querySelector(".media-viewer__stage");
  const image = viewer?.querySelector("[data-media-viewer-image]");
  const caption = viewer?.querySelector("[data-media-viewer-caption]");
  const closeButton = viewer?.querySelector("[data-media-viewer-close]");

  if (
    !(viewer instanceof HTMLDialogElement) ||
    !(stage instanceof HTMLElement) ||
    !(image instanceof HTMLImageElement) ||
    !(caption instanceof HTMLElement) ||
    !(closeButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  const state = {
    trigger: null,
    restoreFocus: false,
    origin: null,
    closeTimer: null,
    closing: false,
  };

  function rememberTrigger(trigger, event) {
    state.trigger = trigger;
    // Keyboard-generated clicks have detail 0 and require focus restoration.
    state.restoreFocus = event.detail === 0;
  }

  function showViewer() {
    state.closing = false;
    viewer.showModal();

    if (reducedMotionQuery.matches) {
      viewer.classList.add("is-visible");
    } else {
      // Let showModal() paint before the CSS opening transition begins.
      requestAnimationFrame(() => viewer.classList.add("is-visible"));
    }
  }

  function closeViewer(pauseVideo = true) {
    if (!viewer.open || state.closing) return;

    if (pauseVideo && viewer.dataset.mediaType === "video") {
      player?.video.pause();
    }

    viewer.classList.remove("is-visible");

    if (reducedMotionQuery.matches) {
      viewer.close();
      return;
    }

    state.closing = true;
    // Native close waits for the matching CSS exit transition.
    state.closeTimer = window.setTimeout(() => viewer.close(), 220);
  }

  function openImage(trigger, event) {
    if (viewer.open) return;

    const source = trigger.querySelector(
      ".practice-card__asset--photo, .result-card__image",
    );

    if (!(source instanceof HTMLImageElement)) return;

    rememberTrigger(trigger, event);
    viewer.dataset.mediaType = "image";
    image.hidden = false;
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    caption.textContent =
      trigger
        .closest("figure")
        ?.querySelector("figcaption h4")
        ?.textContent?.trim() ||
      "Imagem ampliada";
    showViewer();
  }

  function openVideo(trigger, event) {
    if (viewer.open || !player || !player.card.parentNode) return;

    rememberTrigger(trigger, event);

    // Move the real player to preserve playback state and its exact return point.
    const placeholder = document.createElement("div");
    placeholder.className =
      "practice-card__media practice-card__media--video";
    Object.assign(placeholder.style, {
      backgroundImage: `url("${player.video.poster}")`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    });
    placeholder.setAttribute("aria-hidden", "true");

    state.origin = {
      parent: player.card.parentNode,
      nextSibling: player.card.nextSibling,
      placeholder,
    };
    state.origin.parent.insertBefore(placeholder, player.card);

    viewer.dataset.mediaType = "video";
    image.hidden = true;
    trigger.setAttribute("aria-label", "Retornar vídeo ao tamanho normal");
    stage.append(player.card);
    showViewer();
  }

  function restoreVideo() {
    if (!player || !state.origin) return;

    const { parent, nextSibling, placeholder } = state.origin;
    parent.insertBefore(
      player.card,
      nextSibling?.parentNode === parent ? nextSibling : null,
    );
    placeholder.remove();
    player.card
      .querySelector("[data-expand-video]")
      ?.setAttribute(
        "aria-label",
        "Ampliar vídeo do procedimento de harmonização facial",
      );
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest(
      "[data-expand-image], [data-expand-video]",
    );

    if (!(trigger instanceof HTMLButtonElement)) return;

    if (trigger.matches("[data-expand-image]")) {
      openImage(trigger, event);
    } else if (viewer.open) {
      // Minimizing returns the player to its card without interrupting playback.
      closeViewer(false);
    } else {
      openVideo(trigger, event);
    }
  });

  closeButton.addEventListener("click", () => closeViewer());
  viewer.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeViewer();
  });
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer || event.target === stage) closeViewer();
  });
  viewer.addEventListener("close", () => {
    if (state.closeTimer !== null) window.clearTimeout(state.closeTimer);

    restoreVideo();
    image.hidden = true;
    image.removeAttribute("src");
    image.alt = "";
    viewer.dataset.mediaType = "";
    viewer.classList.remove("is-visible");

    if (state.trigger) {
      state.restoreFocus ? state.trigger.focus() : state.trigger.blur();
    }

    state.trigger = null;
    state.restoreFocus = false;
    state.origin = null;
    state.closeTimer = null;
    state.closing = false;
  });
}

initMenu();
initBackToTop();
initFaq();
initMediaViewer(initVideo());
