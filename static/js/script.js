class BeforeAfter {
  constructor(container) {
    this.container = container;
    this.before = container.querySelector('.bal-before');
    this.handle = container.querySelector('.bal-handle');
    this.videos = container.querySelectorAll('video');
    this.position = parseFloat(getComputedStyle(container).getPropertyValue('--wipe-position')) || 50;

    this.handle.setAttribute('role', 'slider');
    this.handle.setAttribute('tabindex', '0');
    this.handle.setAttribute('aria-label', 'Comparison wipe position');
    this.handle.setAttribute('aria-valuemin', '0');
    this.handle.setAttribute('aria-valuemax', '100');
    this.update(this.position);

    container.addEventListener('pointerdown', event => {
      if (event.target.closest('.bal-beforePosition, .bal-afterPosition')) return;
      this.dragging = true;
      container.setPointerCapture(event.pointerId);
      this.move(event.clientX);
    });
    container.addEventListener('pointermove', event => {
      if (this.dragging) this.move(event.clientX);
    });
    container.addEventListener('pointerup', () => { this.dragging = false; });
    container.addEventListener('pointercancel', () => { this.dragging = false; });
    this.handle.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.update(this.position - 2);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.update(this.position + 2);
      } else if (event.key === 'Home') {
        event.preventDefault();
        this.update(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        this.update(100);
      }
    });

    if (this.videos.length === 2) this.syncVideos(this.videos[0], this.videos[1]);
  }

  move(clientX) {
    const rect = this.container.getBoundingClientRect();
    this.update(((clientX - rect.left) / rect.width) * 100);
  }

  update(position) {
    this.position = Math.max(0, Math.min(100, position));
    this.container.style.setProperty('--wipe-position', `${this.position}%`);
    this.handle.setAttribute('aria-valuenow', Math.round(this.position));
  }

  syncVideos(base, comparison) {
    const syncTime = () => {
      if (!Number.isFinite(base.duration) || !Number.isFinite(comparison.duration)) return;
      const progress = base.duration ? base.currentTime / base.duration : 0;
      const targetTime = progress * comparison.duration;
      if (Math.abs(comparison.currentTime - targetTime) > 0.08) comparison.currentTime = targetTime;
    };
    const waitForMetadata = video => new Promise(resolve => {
      if (video.readyState >= 1) resolve();
      else video.addEventListener('loadedmetadata', resolve, { once: true });
    });
    const start = () => {
      base.pause();
      comparison.pause();
      base.currentTime = 0;
      comparison.currentTime = 0;
      base.play().then(() => comparison.play()).catch(() => {});
    };

    base.addEventListener('loadedmetadata', syncTime);
    base.addEventListener('timeupdate', syncTime);
    base.addEventListener('seeking', syncTime);
    base.addEventListener('play', () => comparison.play().catch(() => {}));
    base.addEventListener('pause', () => comparison.pause());
    comparison.addEventListener('play', () => {
      if (base.paused) base.play().catch(() => {});
    });
    comparison.addEventListener('pause', () => {
      if (!base.paused) base.pause();
    });

    Promise.all([waitForMetadata(base), waitForMetadata(comparison)]).then(start);
  }
}
