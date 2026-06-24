import { computed, Directive, input } from '@angular/core';
import { hlm } from '@app/shared/ui/utils';
import type { ClassValue } from 'clsx';

@Directive({
  selector: 'div[hlmTableContainer]',
  host: {
    'data-slot': 'table-container',
    '[class]': '_computedClass()',
  },
})
export class HlmTableContainer {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm('relative w-full overflow-x-auto', this.userClass()));
}

@Directive({
  selector: 'table[hlmTable]',
  host: {
    'data-slot': 'table',
    '[class]': '_computedClass()',
  },
})
export class HlmTable {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm('w-full caption-bottom text-sm', this.userClass()));
}

@Directive({
  selector: 'thead[hlmTHead],thead[hlmTableHeader]',
  host: {
    'data-slot': 'table-header',
    '[class]': '_computedClass()',
  },
})
export class HlmTHead {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm('[&_tr]:border-b', this.userClass()));
}

@Directive({
  selector: 'tbody[hlmTBody],tbody[hlmTableBody]',
  host: {
    'data-slot': 'table-body',
    '[class]': '_computedClass()',
  },
})
export class HlmTBody {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm('[&_tr:last-child]:border-0', this.userClass()));
}

@Directive({
  selector: 'tfoot[hlmTFoot],tfoot[hlmTableFooter]',
  host: {
    'data-slot': 'table-footer',
    '[class]': '_computedClass()',
  },
})
export class HlmTFoot {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() =>
    hlm('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', this.userClass()),
  );
}

@Directive({
  selector: 'tr[hlmTr],tr[hlmTableRow]',
  host: {
    'data-slot': 'table-row',
    '[class]': '_computedClass()',
  },
})
export class HlmTr {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() =>
    hlm(
      'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors has-aria-expanded:bg-muted/50',
      this.userClass(),
    ),
  );
}

@Directive({
  selector: 'th[hlmTh],th[hlmTableHead]',
  host: {
    'data-slot': 'table-head',
    '[class]': '_computedClass()',
  },
})
export class HlmTh {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() =>
    hlm(
      'text-foreground h-10 px-2 text-start align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pe-0',
      this.userClass(),
    ),
  );
}

@Directive({
  selector: 'td[hlmTd],td[hlmTableCell]',
  host: {
    'data-slot': 'table-cell',
    '[class]': '_computedClass()',
  },
})
export class HlmTd {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() =>
    hlm('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0', this.userClass()),
  );
}

@Directive({
  selector: 'caption[hlmCaption],caption[hlmTableCaption]',
  host: {
    'data-slot': 'table-caption',
    '[class]': '_computedClass()',
  },
})
export class HlmCaption {
  public readonly userClass = input<ClassValue>('', { alias: 'class' });
  protected readonly _computedClass = computed(() => hlm('text-muted-foreground mt-4 text-sm', this.userClass()));
}
