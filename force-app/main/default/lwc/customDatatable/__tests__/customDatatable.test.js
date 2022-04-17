import CustomDatatable from 'c/customDatatable';
import { createElement } from 'lwc';

describe('c-custom-datatable', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create', () => {
    // given
    const element = createElement('c-custom-datatable', {
      is: CustomDatatable
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
  });
});
