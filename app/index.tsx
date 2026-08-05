import { CalendarGrid } from '@/src/features/calendar/CalendarGrid';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { AddHangoutModal } from '@/src/features/hangouts/AddHangoutModal';
import { HangoutDetailModal } from '@/src/features/hangouts/HangoutDetailModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { View } from 'react-native';

export default function Home() {
  const calendar = useCalendarScreen();

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 12 }}>
      <MonthHeader
        month={calendar.month}
        year={calendar.year}
        onPrev={calendar.prev}
        onNext={calendar.next}
      />

      <CalendarGrid
        year={calendar.year}
        month={calendar.month}
        byDate={calendar.byDate}
        circleById={calendar.circleById}
        onPressDay={calendar.openAdd}
        onPressHangout={calendar.openDetail}
      />

      <AddHangoutModal
        openDate={calendar.openDate}
        title={calendar.title}
        note={calendar.note}
        pickedCircle={calendar.pickedCircle}
        addingCircle={calendar.addingCircle}
        newCircleName={calendar.newCircleName}
        circles={calendar.circles}
        onClose={calendar.closeAdd}
        onChangeTitle={calendar.setTitle}
        onChangeNote={calendar.setNote}
        onPickCircle={calendar.setPickedCircle}
        onStartAddCircle={() => calendar.setAddingCircle(true)}
        onChangeNewCircleName={calendar.setNewCircleName}
        onCreateCircle={calendar.createCircle}
        onSubmit={calendar.submit}
      />

      <HangoutDetailModal
        openHangout={calendar.openHangout}
        editTitle={calendar.editTitle}
        editNote={calendar.editNote}
        editCircle={calendar.editCircle}
        circles={calendar.circles}
        photos={calendar.photos}
        onClose={() => calendar.setOpenHangout(null)}
        onChangeTitle={calendar.setEditTitle}
        onChangeNote={calendar.setEditNote}
        onPickCircle={calendar.setEditCircle}
        onPickPhoto={calendar.pickPhoto}
        onRemovePhoto={calendar.removePhoto}
        onRemoveHangout={calendar.removeHangout}
        onSave={calendar.saveEdits}
      />
    </View>
  );
}
