import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Shimmering placeholder used for loading states. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="sk"
    [style.width]="width()"
    [style.height]="height()"
    [style.border-radius]="radius()"
    aria-hidden="true"
  ></span>`,
  styles: `
    .sk {
      display: block;
      background: linear-gradient(
        100deg,
        var(--fp-surface-container) 30%,
        var(--fp-surface-container-highest) 50%,
        var(--fp-surface-container) 70%
      );
      background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes sk-shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input('1rem');
  readonly radius = input('var(--fp-radius-sm)');
}
