# Frontend Tech Interview Project
![photos](./Screenshot.png "screenshot")

## Deployed to: https://interview-nu-lemon.vercel.app/

#### Let's install the project locally
`npm install`

#### Let's start the project locally
`npm start`

## Testing
`npm test`
`npm test -- --coverage`
`npm run test:e2e:headless`
`npm run test:all`

### NOTES
- There was build/start error, fixed with `react-scripts --openssl-legacy-provider start`
- node version fixed with nvmrc file
- For api: https://picsum.photos apis are selected
- tailwind installed and used for styling (why: reduce css files dramatically)
- for some photos api was failing, status check added
- lazy loading images for better performance
- placeholder loading indicator added
- caching pictures added via service workers
- starts fetching from page 2, didn't like previous images
- featured picture slides added
- different window size support added
- clicking image opens details, if fails to load HD version, tries to load original picture, if both fails shows error toast
- React Query and persistance added for performance
- Simple error management added for console logs
- Unit tests are added
- End-to-end tests implemented with Cypress for complete user flow testing


