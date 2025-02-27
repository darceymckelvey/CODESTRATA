import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStrataVaultsComponent } from './user.strata-vaults.component';

describe('UserStrataVaultsComponent', () => {
  let component: UserStrataVaultsComponent;
  let fixture: ComponentFixture<UserStrataVaultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserStrataVaultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserStrataVaultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
