import { gql } from 'graphql-tag';
import { rallyTypeDefs } from './types';
import { rallyQueries } from './queries';
import { rallyMutations } from './mutations';

// Combine all rally schema definitions
export const rallySchema = gql`
  ${rallyTypeDefs}
  ${rallyQueries}
  ${rallyMutations}
`;
