'use client';

import { useAppSelector } from '../../lib/hooks/useRedux';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import ViewEmployeeModal from './ViewEmployeeModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AddDepartmentModal from './AddDepartmentModal';
import EditDepartmentModal from './EditDepartmentModal';
import DeleteDepartmentConfirmModal from './DeleteDepartmentConfirmModal';
import BulkInviteModal from './BulkInviteModal';
import AddHolidayModal from './AddHolidayModal';
import EditHolidayModal from './EditHolidayModal';
import DeleteHolidayConfirmModal from './DeleteHolidayConfirmModal';

export default function ModalProvider() {
  const modals = useAppSelector((state) => state.ui.modals);

  return (
    <>
      {modals.addEmployee && <AddEmployeeModal />}
      {modals.editEmployee && <EditEmployeeModal />}
      {modals.addDepartment && <AddDepartmentModal />}
      {modals.editDepartment && <EditDepartmentModal />}
      {modals.employeeDetails && <ViewEmployeeModal />}
      {modals.deleteConfirm && <DeleteConfirmModal />}
      {modals.deleteDepartmentConfirm && <DeleteDepartmentConfirmModal />}
      {modals.bulkInvite && <BulkInviteModal />}
      {modals.addHoliday && <AddHolidayModal />}
      {modals.editHoliday && <EditHolidayModal />}
      {modals.deleteHolidayConfirm && <DeleteHolidayConfirmModal />}
    </>
  );
}



