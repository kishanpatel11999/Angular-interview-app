# Forms — Basic to Advanced

> **Phase:** 2 — Core Angular  
> **Related:** [signals-and-rxjs.md](./signals-and-rxjs.md) | [http-client-and-interceptors.md](./http-client-and-interceptors.md)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [Template-Driven Forms](#template-driven-forms)
3. [Reactive Forms](#reactive-forms)
4. [Form State and Validation](#form-state-and-validation)
5. [Custom Validators](#custom-validators)
6. [Async Validators](#async-validators)
7. [Dynamic Forms](#dynamic-forms)
8. [Typed Forms (Angular 14+)](#typed-forms-angular-14)
9. [ControlValueAccessor](#controlvalueaccessor)
10. [Interview Questions with Answers](#interview-questions-with-answers)
11. [Exercises](#exercises)
12. [Revision Checklist](#revision-checklist)

---

## Learning Objectives

- Implement both template-driven and reactive forms with validation.
- Write custom synchronous and asynchronous validators.
- Build dynamic forms that add and remove fields at runtime.
- Use typed `FormControl` with strict type inference.
- Implement `ControlValueAccessor` for custom form controls.

---

## Template-Driven Forms

Template-driven forms use directives in the template (`ngModel`, `NgForm`) and are suitable for simple forms.

```typescript
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <form #loginForm="ngForm" (ngSubmit)="submit(loginForm)">
      <input
        name="email"
        type="email"
        [(ngModel)]="email"
        required
        email
        #emailControl="ngModel">

      <div *ngIf="emailControl.invalid && emailControl.touched">
        <span *ngIf="emailControl.errors?.['required']">Email is required</span>
        <span *ngIf="emailControl.errors?.['email']">Invalid email format</span>
      </div>

      <input
        name="password"
        type="password"
        [(ngModel)]="password"
        required
        minlength="8"
        #pwControl="ngModel">

      <button type="submit" [disabled]="loginForm.invalid">Log In</button>
    </form>
  `
})
export class LoginFormComponent {
  email = '';
  password = '';

  submit(form: NgForm): void {
    if (form.valid) {
      console.log(form.value); // { email: '...', password: '...' }
    }
  }
}
```

**When to use template-driven forms:**
- Simple forms (login, search, single-field).
- Forms where logic is minimal and template proximity improves readability.
- When the team is not using reactive patterns consistently.

**Limitations:**
- Harder to test (requires DOM).
- Two-way binding is less predictable.
- Dynamic forms are more complex.
- Type safety is limited.

---

## Reactive Forms

Reactive forms define form structure in the component class using `FormControl`, `FormGroup`, and `FormArray`. They are explicit, testable, and type-safe.

```typescript
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div formGroupName="personal">
        <input formControlName="firstName">
        @if (firstName.errors?.['required'] && firstName.touched) {
          <span>First name is required</span>
        }

        <input formControlName="lastName">
      </div>

      <input formControlName="email" type="email">
      <input formControlName="phone" type="tel">

      <button type="submit" [disabled]="form.invalid">Submit</button>
    </form>
  `
})
export class ProfileFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    personal: this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', Validators.required],
    }),
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^\+?[\d\s-]{10,}$/)]],
  });

  // Shorthand accessors
  get firstName() { return this.form.get('personal.firstName')!; }
  get email() { return this.form.get('email')!; }

  submit(): void {
    if (this.form.valid) {
      const value = this.form.getRawValue(); // includes disabled controls
      console.log(value);
    } else {
      this.form.markAllAsTouched(); // show all validation errors
    }
  }
}
```

---

## Form State and Validation

### Status Properties

| Property | Description |
|----------|-------------|
| `valid` | All validators pass |
| `invalid` | At least one validator fails |
| `pending` | Async validator is running |
| `pristine` | User hasn't changed the value |
| `dirty` | User has changed the value |
| `untouched` | User hasn't focused then blurred the control |
| `touched` | User has focused then blurred the control |
| `disabled` | Control is disabled |

### Programmatic Control

```typescript
// Enable/disable
this.form.get('email')?.disable();
this.form.get('email')?.enable();

// Set values
this.form.setValue({ email: 'new@email.com', phone: '' }); // ALL fields required
this.form.patchValue({ email: 'new@email.com' }); // partial update

// Reset form
this.form.reset(); // resets values AND marks pristine/untouched

// Subscribing to value changes
this.form.get('search')?.valueChanges.pipe(
  debounceTime(300),
  takeUntilDestroyed(this.destroyRef)
).subscribe(term => this.search(term));

// Subscribing to status changes
this.form.statusChanges.pipe(
  takeUntilDestroyed(this.destroyRef)
).subscribe(status => console.log('Form status:', status));
```

---

## Custom Validators

### Synchronous Validator

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Functional validator
export function notEmpty(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const isBlank = (control.value || '').trim().length === 0;
    return isBlank ? { notEmpty: { value: control.value } } : null;
  };
}

// Cross-field validator (at group level)
export function passwordsMatch(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordsMismatch: true };
  };
}

// Usage
this.fb.group({
  username: ['', [Validators.required, notEmpty()]],
  password: ['', Validators.required],
  confirmPassword: ['', Validators.required],
}, { validators: passwordsMatch() });
```

### Validator with Parameters

```typescript
export function forbiddenValue(forbidden: string | RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const regex = forbidden instanceof RegExp ? forbidden : new RegExp(forbidden);
    const isForbidden = regex.test(control.value);
    return isForbidden ? { forbiddenValue: { value: control.value, forbidden } } : null;
  };
}

// Usage
email: ['', [Validators.required, forbiddenValue(/@competitor\.com$/)]]
```

---

## Async Validators

Async validators return `Observable<ValidationErrors | null>` or `Promise<ValidationErrors | null>`.

```typescript
import { AsyncValidatorFn, AbstractControl } from '@angular/forms';
import { inject } from '@angular/core';

export function usernameAvailable(): AsyncValidatorFn {
  const userService = inject(UserService);
  
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);
    
    return timer(300).pipe( // debounce — avoids request on every keystroke
      switchMap(() => userService.checkUsername(control.value)),
      map(isAvailable => isAvailable ? null : { usernameTaken: true }),
      catchError(() => of(null)) // treat errors as valid (fail open)
    );
  };
}

// Usage — async validators go in the third argument
username: ['', [Validators.required], [usernameAvailable()]]
```

**UX tip:** Show a spinner when a control's status is `'PENDING'`:
```html
@if (username.pending) {
  <app-spinner />
}
@if (username.errors?.['usernameTaken']) {
  <span>Username is taken</span>
}
```

---

## Dynamic Forms

```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <div formArrayName="emails">
        @for (control of emailControls.controls; track $index; let i = $index) {
          <div>
            <input [formControlName]="i" type="email">
            <button type="button" (click)="removeEmail(i)">Remove</button>
          </div>
        }
      </div>
      <button type="button" (click)="addEmail()">Add Email</button>
    </form>
  `
})
export class DynamicFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    emails: this.fb.array([
      this.fb.control('', [Validators.required, Validators.email])
    ])
  });

  get emailControls() {
    return this.form.get('emails') as FormArray;
  }

  addEmail(): void {
    this.emailControls.push(
      this.fb.control('', [Validators.required, Validators.email])
    );
  }

  removeEmail(index: number): void {
    this.emailControls.removeAt(index);
  }
}
```

---

## Typed Forms (Angular 14+)

Angular 14 introduced strictly typed reactive forms, replacing all `any` types.

```typescript
// FormControl<T> — fully typed
const name = new FormControl<string>('', { nonNullable: true });
name.value; // string (not string | null)

// FormGroup — type inferred from structure
const form = new FormGroup({
  name: new FormControl('', { nonNullable: true, validators: Validators.required }),
  age: new FormControl<number | null>(null),
});

// Type of form.value
// { name: string; age: number | null; }

// TypedFormGroup helper pattern
type UserForm = {
  name: FormControl<string>;
  age: FormControl<number | null>;
};

const userForm: FormGroup<UserForm> = new FormGroup<UserForm>({
  name: new FormControl('', { nonNullable: true }),
  age: new FormControl(null),
});
```

---

## ControlValueAccessor

`ControlValueAccessor` allows a custom component to work as a form control in both template-driven and reactive forms.

```typescript
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [FormsModule],
  selector: 'app-rating',
  template: `
    @for (star of stars; track star) {
      <button
        type="button"
        [class.filled]="star <= value"
        [disabled]="disabled"
        (click)="setValue(star)">★</button>
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RatingComponent),
      multi: true,
    }
  ]
})
export class RatingComponent implements ControlValueAccessor {
  stars = [1, 2, 3, 4, 5];
  value = 0;
  disabled = false;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  // Called by Angular to write a value into the control
  writeValue(value: number): void {
    this.value = value ?? 0;
  }

  // Called to register change callback
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  // Called to register touched callback
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Called by Angular when disabled state changes
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  setValue(star: number): void {
    if (!this.disabled) {
      this.value = star;
      this.onChange(star);
      this.onTouched();
    }
  }
}

// Usage in reactive form
form = this.fb.group({ rating: [0, Validators.min(1)] });
// <app-rating formControlName="rating" />

// Usage in template-driven form
// <app-rating [(ngModel)]="userRating" />
```

---

## Interview Questions with Answers

**Q: When would you choose reactive forms over template-driven forms?**

> Reactive forms are preferred for: (1) Complex validation logic that is easier to express and test in TypeScript than in template directives; (2) Dynamic forms where fields are added or removed at runtime using `FormArray`; (3) Forms that need to react to value changes with RxJS operators (debounce, switchMap); (4) Large forms where testability is important — reactive form logic can be tested without rendering a component; (5) When strong typing (Angular 14+ typed forms) is required. Template-driven forms are acceptable for very simple forms (login, single-field search) where template proximity adds clarity.

**Q: How do you implement cross-field validation?**

> Add a validator function at the `FormGroup` level (third parameter of `fb.group()` or `validators` property of `FormGroup`). The validator receives the `AbstractControl` for the entire group, from which you can access sibling controls via `.get('fieldName')`. Return `null` if valid, or a `ValidationErrors` object if invalid. The error appears on the group, not on individual controls, so you must access it via `form.errors?.['yourErrorKey']` in the template.

**Q: What is the difference between `form.setValue()` and `form.patchValue()`?**

> `setValue()` requires you to provide values for ALL controls in the form group. It throws if any key is missing or extra. `patchValue()` accepts a partial object — only the provided keys are updated; missing keys are left unchanged. Use `patchValue()` for partial updates (editing a subset of fields) and `setValue()` when you want to ensure the entire form is reset to known values.

---

## Exercises

1. Build a multi-step registration form with three steps. State should be preserved when navigating between steps.
2. Implement an async email uniqueness validator that debounces for 400ms before calling the API.
3. Create a dynamic phone numbers form that allows adding/removing phone number fields (FormArray) with validation.
4. Build a `<app-date-range>` custom form control using `ControlValueAccessor` that emits `{ start: Date, end: Date }`.

---

## Revision Checklist

- [ ] Know the difference between template-driven and reactive forms.
- [ ] Can implement cross-field validation at `FormGroup` level.
- [ ] Can write async validators using `Observable<ValidationErrors | null>`.
- [ ] Know how to use `FormArray` for dynamic fields.
- [ ] Know how to use typed `FormControl<T>` (Angular 14+).
- [ ] Can implement `ControlValueAccessor` for a custom form control.

---

## Further Reading

- [Angular: Reactive forms](https://angular.dev/guide/forms/reactive-forms)
- [Angular: Typed forms](https://angular.dev/guide/forms/typed-forms)
- [Angular: Custom validators](https://angular.dev/guide/forms/form-validation#defining-custom-validators)
- [Angular: ControlValueAccessor](https://angular.dev/api/forms/ControlValueAccessor)
