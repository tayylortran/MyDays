import { CalendarGrid } from '@/src/features/calendar/CalendarGrid';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { HangoutFlowModal } from '@/src/features/hangouts/HangoutFlowModal';
import { EditCircleModal } from '@/src/features/hangouts/EditCircleModal';
import { useCalendarScreen } from '@/src/features/hangouts/useCalendarScreen';
import { Pressable, Text, View } from 'react-native';

export default function Home() {
  const calendar = useCalendarScreen(); //calls the brain and stores everything it hands back as a variable called calendar. 
  //it holds all the actions and data for this screen. 


  const monthKey = `${calendar.year}-${String(calendar.month + 1).padStart(2, '0')}`;
  const hangoutCount = Object.entries(calendar.byDate)
    .filter(([date]) => date.startsWith(`${monthKey}-`))
    .reduce((total, [, hangouts]) => total + hangouts.length, 0);

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 8 }}>
      <MonthHeader //component
        month={calendar.month} //"passing props".
        year={calendar.year}
        subtitle={`${hangoutCount} ${hangoutCount === 1 ? 'hangout' : 'hangouts'}`}
        onPrev={calendar.prev}
        onNext={calendar.next}
      />

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
          paddingHorizontal: 2,
        }}
      >
        {calendar.circles.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => calendar.openEditCircle(c)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: c.color,
              }}
            />
            <Text style={{ fontSize: 12, color: '#555' }}>
              {c.name}
            </Text>
          </Pressable>
        ))}

        <Pressable onPress={calendar.openCreateCircle}>
          <Text style={{ fontSize: 18, color: '#555' }}>+</Text>
        </Pressable>
      </View>

      <CalendarGrid //component
        year={calendar.year}
        month={calendar.month}
        byDate={calendar.byDate}
        circleById={calendar.circleById}
        onPressDay={calendar.openAdd}
        onPressHangout={calendar.openDetail}
      />

      <HangoutFlowModal controller={calendar.hangoutEditor} circles={calendar.circles} />

      <EditCircleModal
        editingCircle={calendar.editingCircle}
        creatingCircle={calendar.creatingCircle}
        newCircleName={calendar.newCircleName}
        circleColor={calendar.circleColor}
        circles={calendar.circles}
        deletingCircle={calendar.deletingCircle}
        circleHangoutCount={calendar.circleHangoutCount}
        deleteDestinationId={calendar.deleteDestinationId}
        onClose={calendar.closeCircleModal}
        onChangeNewCircleName={calendar.setNewCircleName}
        onChangeCircleColor={calendar.setCircleColor}
        onSaveCircle={calendar.saveCircle}
        onStartDelete={calendar.startDeleteCircle}
        onCancelDelete={calendar.cancelDeleteCircle}
        onChangeDeleteDestination={calendar.setDeleteDestinationId}
        onDelete={calendar.deleteCircle}
      />
    </View>
  );
}
