import GraphqlMapView from 'c/graphqlMapView';
import { createElement } from 'lwc';

describe('c-graphql-map-view', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should create and be accessible', async () => {
    // given
    const element = createElement('c-graphql-map-view', {
      is: GraphqlMapView
    });

    // when
    document.body.appendChild(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });
});
