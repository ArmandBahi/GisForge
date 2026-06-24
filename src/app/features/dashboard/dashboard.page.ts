import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HlmButtonImports } from '@app/shared/ui/button';
import { HlmInputImports } from '@app/shared/ui/input';
import { HlmLabelImports } from '@app/shared/ui/label';

@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmInputImports, HlmLabelImports],
  template: `
    <div class="space-y-6 max-w-lg">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">GisForge</h1>
        <p class="text-muted-foreground text-sm mt-1">
          Forge your own GIS
        </p>
      </div>

      <div class="rounded-lg border bg-card p-4 space-y-4">
        <p class="text-sm text-muted-foreground">
          Composants Spartan UI de base (bouton, input, label).
        </p>
        <div class="space-y-2">
          <label hlmLabel for="demo-input">Champ de démo</label>
          <input hlmInput id="demo-input" placeholder="Texte…" class="w-full" />
        </div>
        <button hlmBtn type="button">Bouton primaire</button>
      </div>
    </div>
  `,
})
export class DashboardPage {}
