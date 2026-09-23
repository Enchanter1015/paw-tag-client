import { TestBed } from '@angular/core/testing';
import { PageHeaderService } from './page-header.service';

describe('PageHeaderService', () => {
  let service: PageHeaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PageHeaderService);
  });

  it('defaults to the PawTag title with no left icon', () => {
    expect(service.config().title()).toBe('PawTag');
    expect(service.config().left).toEqual({ kind: 'none' });
  });

  it('stores a page-supplied config', () => {
    const onClick = () => {};
    service.set({ title: () => 'Kalu', left: { kind: 'back' }, action: { kind: 'edit', onClick } });

    expect(service.config().title()).toBe('Kalu');
    expect(service.config().left).toEqual({ kind: 'back' });
    expect(service.config().action).toEqual({ kind: 'edit', onClick });
  });

  it('reset() restores the default config', () => {
    service.set({ title: () => 'Kalu', left: { kind: 'back' } });
    service.reset();

    expect(service.config().title()).toBe('PawTag');
    expect(service.config().left).toEqual({ kind: 'none' });
  });
});
