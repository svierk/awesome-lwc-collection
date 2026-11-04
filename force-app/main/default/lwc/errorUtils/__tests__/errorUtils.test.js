import { getErrorMessage, showErrorToast } from 'c/errorUtils';

describe('c-error-utils', () => {
  it.each([
    ['an apex or network error', { body: { message: 'Apex failed' } }, 'Apex failed'],
    ['a ui api read error', { body: [{ message: 'Read failed' }] }, 'Read failed'],
    ['page level errors', { body: { pageErrors: [{ message: 'Page failed' }] } }, 'Page failed'],
    ['field level errors', { body: { fieldErrors: { Name: [{ message: 'Field failed' }] } } }, 'Field failed'],
    ['ui api dml page errors', { body: { output: { errors: [{ message: 'Dml failed' }] } } }, 'Dml failed'],
    [
      'ui api dml field errors',
      { body: { output: { fieldErrors: { Name: [{ message: 'Dml field failed' }] } } } },
      'Dml field failed'
    ],
    ['graphql errors', [{ message: 'First' }, { message: 'Second' }], 'First, Second'],
    ['a browser error', new DOMException('Permission denied', 'NotAllowedError'), 'Permission denied'],
    ['a javascript error', new Error('Broken'), 'Broken'],
    ['a string', 'Plain text', 'Plain text'],
    ['an http status text', { statusText: 'Bad Gateway' }, 'Bad Gateway']
  ])('should read the message of %s', (_label, error, expected) => {
    // when
    const message = getErrorMessage(error);

    // then
    expect(message).toBe(expected);
  });

  it('should prefer the body message over the generic error message', () => {
    // given
    const error = { message: 'Generic', body: { message: 'Specific' } };

    // when
    const message = getErrorMessage(error);

    // then
    expect(message).toBe('Specific');
  });

  it('should list a repeated message once', () => {
    // given
    const errors = [{ message: 'Same' }, { message: 'Same' }];

    // when
    const message = getErrorMessage(errors);

    // then
    expect(message).toBe('Same');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty array', []],
    ['an unknown shape', { code: 42 }],
    ['an empty message', { message: '' }]
  ])('should use the default fallback for %s', (_label, error) => {
    // when
    const message = getErrorMessage(error);

    // then
    expect(message).toBe('Unknown error');
  });

  it('should use a custom fallback', () => {
    // when
    const message = getErrorMessage(undefined, '');

    // then
    expect(message).toBe('');
  });

  it('should dispatch an error toast with the title and the message', () => {
    // given
    const component = { dispatchEvent: jest.fn() };

    // when
    showErrorToast(component, 'Something failed', new Error('Broken'));

    // then
    const event = component.dispatchEvent.mock.calls[0][0];
    expect(event.detail).toMatchObject({ title: 'Something failed', message: 'Broken', variant: 'error' });
  });
});
