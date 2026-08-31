export async function registerCustomBlotFormatter(Quill) {
  if (typeof window === 'undefined') return {};

  const blotModule = await import('quill-blot-formatter');
  const BlotFormatter = blotModule.default;
  const Action = blotModule.Action;
  const ImageSpec = blotModule.ImageSpec;

  class CustomDeleteAction extends Action {
    onCreate() {
      this.button = document.createElement('div');
      this.button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: #ef4444;">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;
      this.button.style.cssText = `
        position: absolute;
        top: -14px;
        right: -14px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;
      this.button.addEventListener('click', this.onClick);
      this.formatter.overlay.appendChild(this.button);
    }

    onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.formatter.currentSpec) {
        const target = this.formatter.currentSpec.getTargetElement();
        if (target) {
          const blot = Quill.find(target);
          if (blot) {
            blot.deleteAt(0);
          } else {
            target.remove();
          }
          this.formatter.hide();
        }
      }
    };

    onDestroy() {
      if (this.button) {
        this.button.removeEventListener('click', this.onClick);
        this.formatter.overlay.removeChild(this.button);
        this.button = null;
      }
    }
  }

  class CustomImageSpec extends ImageSpec {
    getActions() {
      return [blotModule.AlignAction, blotModule.ResizeAction, blotModule.DeleteAction, CustomDeleteAction];
    }
  }

  Quill.register('modules/blotFormatter', BlotFormatter);

  // Return the configuration object to inject into quillModules
  return {
    specs: [CustomImageSpec]
  };
}
