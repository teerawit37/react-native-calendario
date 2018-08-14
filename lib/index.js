// @flow
import React from 'react';
import { FlatList } from 'react-native';
import moment from 'moment';

import Month from './components/Month';
import { getMonthsList, markSelectedDays } from './utils';
import { isValidDate } from './utils/date';
import type { MonthType, ViewTokenType, ThemeType, LocaleType, DayType } from './types';

type RangeType = {
  startDate: Date,
  endDate?: ?Date
}

type CalendarType = {
  onChange: (range: RangeType) => void,
  initialListSize: number,
  numberOfMonths?: number,
  startingMonth?: string,
  minDate?: ?string,
  maxDate?: ?string,
  startDate?: ?string,
  endDate?: ?string,
  theme: ThemeType,
  showWeekdays: boolean,
  showMonthTitle: boolean,
  locale: LocaleType,
  monthNames?: Array<string>,
  dayNames: Array<string>,
  disableRange?: boolean,
  monthHeight: number,
  firstDayMonday: boolean,
  renderDayContent?: DayType => ?React.Element<any>,
  extraData: any,
  viewableItemsChanged: ViewableItemsType => void
};

type StateType = {
  months: Array<MonthType>,
  visibleMonths: Array<MonthType>,
  initialListSize: number,
  firstViewableIndex: number,
  lastViewableIndex: number,
  initialScrollIndex: number,
  startDate?: ?Date,
  endDate?: ?Date
};

type ViewableItemsType = {
  changed: Array<ViewTokenType>,
  viewableItems: Array<ViewTokenType>
};

const INITIAL_MONTH = 0;
const NUMBER_OF_MONTHS = 12;
const MONTH_HEIGHT = 370;

const DIFF_VISIBLE = 1;
const LAST_RENDERED = 6;

const VIEWABILITY_CONFIG = {
  waitForInteraction: true,
  viewAreaCoveragePercentThreshold: 2,
};

function visibleMonthsChanged(oldMonths: Array<MonthType>, newMonths: Array<MonthType>): boolean {
  for (let i = 0; i < oldMonths.length; i++) {
    if (newMonths[i].isVisible !== oldMonths[i].isVisible) {
      return true;
    }
  }

  return false;
}

export default class Calendar extends React.Component<CalendarType, StateType> {
  static defaultProps = {
    numberOfMonths: NUMBER_OF_MONTHS,
    startingMonth: moment().format('YYYY-MM-DD'),
    initialListSize: 2,
    showWeekdays: true,
    showMonthTitle: true,
    theme: {},
    locale: 'en',
    monthNames: [],
    dayNames: [],
    disableRange: false,
    firstDayMonday: false,
    monthHeight: MONTH_HEIGHT,
    minDate: null,
    maxDate: null,
    startDate: null,
    endDate: null,
    renderDayContent: null,
  }

  state = {
    months: [],
    visibleMonths: [],
    initialListSize: 2,
    firstViewableIndex: 0,
    lastViewableIndex: 0,
    initialScrollIndex: 0,
    startDate: null,
    endDate: null,
  }

  componentWillMount() {
    const {
      initialListSize,
      numberOfMonths,
      startingMonth,
      startDate,
      endDate,
      minDate,
      maxDate,
      locale,
      monthNames,
      disableRange,
      firstDayMonday,
    } = this.props;

    const firstMonthToRender = startingMonth && isValidDate(new Date(startingMonth))
      ? moment(startingMonth, 'YYYY-MM-DD').toDate() : moment().toDate();
    const min = minDate && isValidDate(new Date(minDate))
      ? moment(minDate, 'YYYY-MM-DD').toDate() : null;
    const max = maxDate && isValidDate(new Date(maxDate))
      ? moment(maxDate, 'YYYY-MM-DD').toDate() : null;
    const start = startDate && isValidDate(new Date(startDate))
      ? moment(startDate, 'YYYY-MM-DD').toDate() : null;
    const end = endDate && isValidDate(new Date(endDate))
      ? moment(endDate, 'YYYY-MM-DD').toDate() : null;

    const months: Array<MonthType> = getMonthsList(
      firstMonthToRender,
      numberOfMonths,
      initialListSize + DIFF_VISIBLE,
      start,
      end,
      min,
      max,
      locale,
      monthNames,
      disableRange,
      firstDayMonday,
    );

    let visibleMonths: Array<MonthType> = months;
    let firstMonthIndex = 0;
    if (start) {
      const firstMonth = visibleMonths.find((m: MonthType): boolean =>
        m.monthNumber === start.getMonth() && m.year === start.getFullYear());

      firstMonthIndex = visibleMonths.indexOf(firstMonth) || 0;
    } else {
      visibleMonths = months.slice(INITIAL_MONTH, LAST_RENDERED);
    }

    this.setState({
      initialScrollIndex: firstMonthIndex,
      initialListSize,
      months,
      visibleMonths,
      startDate: start,
      endDate: end,
    });
  }

  componentWillReceiveProps(nextProps: CalendarType) {
    const startDate = nextProps.startDate && isValidDate(new Date(nextProps.startDate))
      ? moment(nextProps.startDate, 'YYYY-MM-DD').toDate() : null;
    const endDate = nextProps.endDate && isValidDate(new Date(nextProps.endDate))
      ? moment(nextProps.endDate, 'YYYY-MM-DD').toDate() : null;

    if (this.state.startDate !== startDate || this.state.endDate !== endDate) {
      const months: Array<MonthType> = this.daysChanged(startDate, endDate);
      this.setState({
        startDate,
        endDate,
        months,
        visibleMonths: months,
      });
    }
  }

  shouldComponentUpdate(nextProps: CalendarType, nextState: StateType): boolean {
    return (
      this.state.visibleMonths.length !== nextState.visibleMonths.length
      || visibleMonthsChanged(this.state.months, nextState.months)
      || this.state.startDate !== nextState.startDate
      || this.state.endDate !== nextState.endDate
      || this.props.renderDayContent !== nextProps.renderDayContent
    );
  }

  getItemLayout = (data: any, index: number): {length: number, offset: number, index: number} => ({
    length: this.props.monthHeight,
    offset: this.props.monthHeight * index,
    index,
  })

  keyExtractor = (item: MonthType): string => String(item.id);

  daysChanged = (startDate?: Date, endDate?: Date): Array<MonthType> =>
    this.state.months.map((month: MonthType): MonthType => {
      const currentMonth = moment([month.year, month.monthNumber]).toDate();
      let monthHasSelectedDays =
        (endDate && startDate && currentMonth >= startDate && currentMonth <= endDate)
        || (!endDate && startDate
          && month.monthNumber === startDate.getMonth()
          && month.year === startDate.getFullYear())
        || (this.state.endDate && this.state.startDate
          && currentMonth >= this.state.startDate
          && currentMonth <= this.state.endDate
        ) || (!this.state.endDate && this.state.startDate
          && month.monthNumber === this.state.startDate.getMonth()
          && month.year === this.state.startDate.getFullYear()
        ) || (!startDate && this.state.startDate)
        || (this.state.startDate && this.state.startDate.getMonth() === month.monthNumber &&
            this.state.startDate.getFullYear() === month.year ||
            this.state.endDate && this.state.endDate.getMonth() === month.monthNumber
            && this.state.endDate.getFullYear() === month.year);

      if (monthHasSelectedDays==null) {
          if (moment(currentMonth).format('MM-YYYY') == moment(startDate).format('MM-YYYY')) {
            monthHasSelectedDays = true;
          }
      }

      if (monthHasSelectedDays) {
        const days = markSelectedDays(
          currentMonth,
          month.days,
          startDate,
          endDate,
          this.props.disableRange,
        );
        return {
          ...month,
          days,
          startDate,
          endDate,
        };
      }

      return {
        ...month,
        startDate,
        endDate,
      };
    })

  viewableItemsChanged = (first: number, last: number): boolean =>
    this.state.firstViewableIndex !== first || this.state.lastViewableIndex !== last

  handleViewableItemsChange = (info: ViewableItemsType) => {
    const firstItemVisible = info.viewableItems[0];
    const lastVisibleItem = info.viewableItems[info.viewableItems.length - 1];
    const firstViewableIndex = firstItemVisible.index || 0;
    const lastViewableIndex = lastVisibleItem.index || this.state.lastViewableIndex;

    if (this.viewableItemsChanged(firstViewableIndex, lastViewableIndex)) {
      if (this.props.viewableItemsChanged) {
        this.props.viewableItemsChanged(info);
      }

      const months = this.state.months.map((month: MonthType, i: number) => {
        // const last = lastViewableIndex + DIFF_VISIBLE;
        const isVisible = i >= firstViewableIndex - DIFF_VISIBLE
          && i <= lastViewableIndex + DIFF_VISIBLE + 1;

        return {
          ...month,
          isVisible,
        };
      });

      this.setState({
        firstViewableIndex,
        lastViewableIndex,
        visibleMonths: months,
        months,
      });
    }
  }

  handlePressDay = (date: Date) => {
    const newRange = {};

    if (this.props.disableRange) {
      newRange.startDate = date;
      newRange.endDate = date;
    } else if (this.state.startDate) {
      if (this.state.endDate) {
        newRange.startDate = date;
        newRange.endDate = null;
      } else if (date < this.state.startDate) {
        newRange.startDate = date;
      } else if (date > this.state.startDate) {
        newRange.startDate = this.state.startDate;
        newRange.endDate = date;
      } else {
        newRange.startDate = date;
        newRange.endDate = date;
      }
    } else {
      newRange.startDate = date;
    }

    const months: Array<MonthType> = this.daysChanged(newRange.startDate, newRange.endDate);

    this.setState({
      ...newRange,
      months,
      visibleMonths: months,
    }, () => this.props.onChange(newRange));
  }

  // eslint-disable-next-line
  renderMonth = ({ item }: { item: MonthType }) => (
    <Month
      onPress={this.handlePressDay}
      month={item}
      theme={this.props.theme}
      showWeekdays={this.props.showWeekdays}
      showMonthTitle={this.props.showMonthTitle}
      locale={this.props.locale}
      dayNames={this.props.dayNames}
      height={this.props.monthHeight}
      firstDayMonday={this.props.firstDayMonday}
      renderDayContent={this.props.renderDayContent}
      extraData={this.props.extraData}
    />
  )

  render() {
    return (
      <FlatList
        getItemLayout={this.getItemLayout}
        initialScrollIndex={this.state.initialScrollIndex}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={this.handleViewableItemsChange}
        initialNumToRender={this.state.initialListSize}
        keyExtractor={this.keyExtractor}
        renderItem={this.renderMonth}
        extraData={this.props.extraData}
        data={this.state.visibleMonths}
      />
    );
  }
}
