import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import employeeSlice from './slices/employeeSlice';
import departmentSlice from './slices/departmentSlice';
import holidaySlice from './slices/holidaySlice';
import uiSlice from './slices/uiSlice';
import taskSlice from './slices/taskSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    employees: employeeSlice,
    departments: departmentSlice,
    holidays: holidaySlice,
    ui: uiSlice,
    tasks: taskSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;



