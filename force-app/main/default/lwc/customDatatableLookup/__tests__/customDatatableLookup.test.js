import CustomDatatableLookup from 'c/customDatatableLookup';
import { createElement } from 'lwc';

describe('c-custom-datatable-lookup', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-custom-datatable-lookup', {
      is: CustomDatatableLookup
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
