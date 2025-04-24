// import { baseAPI } from './baseAPI'
//
// interface LoginRequest { username: string; password: string }
// interface LoginResponse { accessToken: string; refreshToken: string }
//
// interface RefreshResponse { accessToken: string; refreshToken: string }
// interface UserProfile { id: string; email: string; name: string }
//
// export const authApi = baseAPI.injectEndpoints({
//     endpoints: (build) => ({
//         login: build.mutation<LoginResponse, LoginRequest>({
//             query: (credentials) => ({
//                 url: '/auth/login',
//                 method: 'POST',
//                 body: credentials,
//             }),
//             // on success, you might want to write the token into a separate auth slice:
//             async onQueryStarted(arg, { dispatch, queryFulfilled }) {
//                 try {
//                     const { data } = await queryFulfilled
//                     dispatch(
//                         // some authSlice action to save tokens:
//                         // authSlice.actions.setCredentials(data)
//                         { type: 'auth/setCredentials', payload: data }
//                     )
//                 } catch {
//                     // handle error
//                 }
//             },
//         }),
//         refreshToken: build.mutation<RefreshResponse, void>({
//             query: () => ({
//                 url: '/auth/refresh',
//                 method: 'POST',
//             }),
//             async onQueryStarted(_, { dispatch, queryFulfilled }) {
//                 try {
//                     const { data } = await queryFulfilled
//                     dispatch({ type: 'auth/setCredentials', payload: data })
//                 } catch {
//                     // handle refresh failure (e.g. logout)
//                 }
//             },
//         }),
//         getProfile: build.query<UserProfile, void>({
//             query: () => '/auth/profile',
//             providesTags: ['User'],
//         }),
//     }),
//     overrideExisting: false,
// })
//
// export const {
//     useLoginMutation,
//     useRefreshTokenMutation,
//     useGetProfileQuery,
// } = authApi
