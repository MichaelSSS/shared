
/**
 * Класс для расчета прибыли с учетом капитализации
 */
var Capitalization = function(sum, duration, dayRate) {
  this.date = new Date;
  // start from next day
  this.date.setDate(this.date.getDate() + 1);
  this.days = 0;
  this.baseSum = this.sum = sum;
  this.duration = duration;
  this.dayRate = dayRate;
};
Capitalization.prototype = {
  constructor: Capitalization,
  capitalize: function() {
    while(this.capitalizeMonth());

    return this.getProfit();
  },
  capitalizeMonth: function() {
    var days = Math.min(this.getDaysMonthEnd(), this.duration - this.days);
    if (days <= 0) return false;

    this.days += days;
    this.baseSum += this.baseSum * days * this.dayRate;
    // set on the first day of the next month
    this.date.setDate(this.date.getDate() + days);

    return true;
  },
  offsetDate: function(days) {
    this.date.setDate(this.date.getDate() + parseInt(days));

    return this;
  },
  /**
   * @return int Number of days up to the end of the month of the active date
   */
  getDaysMonthEnd: function() {
    var month = this.date.getMonth(),
      next = new Date;

    // last day of the current month
    next.setMonth(month + 1);
    next.setDate(0);

    return next.getDate() - this.date.getDate() + 1;
  },
  getProfit: function() {
    return this.baseSum - this.sum;
  }
};

/**
 * Базовый класс "Депозит"
 */
var Deposit = function(params) {
  this.init(params);
};
Deposit.prototype = {
  constructor: Deposit,
  init: function(params) {
    this.params = angular.extend({
      minSum: { rur: 10000, usd: 300, eur: 300 },
      maxSum: { rur: 10000000, usd: 300000, eur: 300000 },
    }, params);
  },
  getProfit: function() {
    this.sum = Calculator.getSum();
    this.duration = Calculator.getDuration();
    this.currency = Calculator.getCurrency();
    return this.calcProfit(this.sum, this.currency, this.duration, Calculator.getCap());
  },
  calcProfit: function(sum, currency, duration, cap) {
    if (sum < this.params.minSum[currency]) return this.profit = 0;
    if (cap && !this.params.capitalization) return this.profit = 0;

    var dayRate = this.getRatePerDay(duration, currency),
      profit = 0;

    if(cap) {
      profit = this.calcProfitCap(dayRate);
    } else {
      profit = dayRate * this.duration * this.sum;
    }
    return this.profit = profit;
  },
  calcProfitCap: function(dayRate) {
    var capitalization;

    capitalization = new Capitalization(this.sum, this.duration, dayRate);
    
    return capitalization.capitalize();
  },
  getRatePerDay: function(duration, currency) {
    var rate = this.getRate(duration, currency);
    return this.yearToDayRate(rate);
  },
  yearToDayRate: function(yearRate) {
    return yearRate / 365;
  },
  getRate: function(duration, currency) {
    var stopDuration, localDuration, previousDuration, rates;

    if(this.params.minDuration > duration) return 0;

    rates = this.params.rates;
    previousDuration = Object.keys(rates)[0];
    for(stopDuration in rates) {
      if (duration < stopDuration) {
        break;
      }
      previousDuration = stopDuration;
    }
    return rates[previousDuration][currency] / 100;
  },
  reset: function() {
    this.profit = 0;
  }
};
Deposit.extend = function(options) {
  var Child = function(params) {
    Deposit.call(this, params);
  };
  Object.keys(options).forEach(function(opt) {
    options[opt] = {
      value: options[opt],
      enumerable: true,
      configurable: true, 
      writable: true
    }
  });
  Child.prototype = Object.create(Deposit.prototype, options);
  Child.prototype.constructor = Child;
  return Child;
};

/**
 * Депозит "Перспективный""
 */
var DepositPerspective = Deposit.extend({
  getRate: function(duration, currency) {
    var totalDuration, localDuration, previousDuration, rates;

    for(totalDuration in this.params.rates) {
      if(totalDuration != duration) continue;

      rates = this.params.rates[totalDuration];
      previousDuration = Object.keys(rates)[0];
      for(localDuration in rates) {
        if (duration < localDuration) {
          break;
        }
        previousDuration = localDuration;
      }
      return rates[previousDuration][currency] / 100;
    }
    return 0;
  },
  calcProfit: function(sum, currency, duration, cap) {
    var totalDuration, localDuration, previousDuration, rates, rate, days, profit;

    if(cap) return this.profit = 0;

    for(totalDuration in this.params.rates) {
      if(totalDuration != duration) continue;

      rates = this.params.rates[totalDuration];
      profit = 0;
      previousDuration = 0;
      for(localDuration in rates) {
        rate = this.yearToDayRate(rates[localDuration][currency] / 100);
        days = localDuration - previousDuration;
        profit += rate * days * sum;
        previousDuration = localDuration;
      }
      return this.profit = profit;
    }
    return this.profit = 0;
  }
});

/**
 * Депозит "Лидер"
 */
var DepositLeader = Deposit.extend({
  getRate: function(duration, currency) {
    if (!this.params.rates[duration] || !currency) return 0;
    return this.params.rates[duration][currency] / 100;
  }
});
DepositLeader.prototype.constructor = DepositLeader;

/**
 * Депозит "Пенсионный"
 */
var DepositPension = Deposit.extend({
  getRate: function(duration, currency) {
    if(currency != 'rur') return 0;
    return Deposit.prototype.getRate.call(this, duration, currency);
  }
});

/**
 * Депозит "Кошелек"
 */
var DepositPurse = Deposit.extend({
  init: function(params) {
    Deposit.prototype.init.call(this, params);
  },
  getRate: function(duration, currency) {
    var stopDuration, stopSum, previousDuration, lastSum, rates;

    if(this.params.minDuration > duration) return 0;

    rates = this.params.rates;
    previousDuration = Object.keys(rates)[0];
    for(stopDuration in rates) {
      if (duration < stopDuration) break;

      previousDuration = stopDuration;
    }
    
    rates = rates[previousDuration][currency];
    lastSum = this.minSum;
    for(stopSum in rates) {
      if(this.sum < stopSum) break;
      
      lastSum = stopSum;
    }

    return rates[lastSum] / 100;
  }
});

var Durations = {
  m2dMap: { 3: 91, 6: 185, 9: 270, 12: 375, 18: 545, 24: 750 },
  m2d: function(months) {
    return this.m2dMap[months];
  }
}

/**
 * Класс управляющий расчетом
 */
var Calculator = {
  steps: { rur: 5000, usd: 100, eur: 100 },
  getSum: function() {
    return this.params.sum;
  },
  getCurrency: function() {
    return this.params.currency;
  },
  getDuration: function() {
    return Durations.m2d(this.params.duration);
  },
  getCap: function() {
    return this.params.capitalization;
  },
  deposites: [],
  addDeposit: function(params) {
    var deposit;

    switch(params.id) {
      case 'leader': deposit = new DepositLeader(params); break;
      case 'perspective': deposit = new DepositPerspective(params); break;
      case 'pension': deposit = new DepositPension(params); break;
      case 'purse': deposit = new DepositPurse(params); break;
      default: deposit = new Deposit(params);
    }

    return Calculator.deposites.push(deposit);
  },
  /**
   * Выполняет весь расчет
   */
  calculate: function() {
    var i, len, minProfit = false, maxProfit = false, profit, deposit;

    for (i = 0, len = Calculator.deposites.length; i < len; i++) {
      deposit = Calculator.deposites[i];
      deposit.reset();
      if(!this.filterByParams(deposit)) continue;
      profit = deposit.getProfit();
      if ((minProfit === false || minProfit > profit) && profit > 0) minProfit = profit;
      if (maxProfit === false || maxProfit < profit) maxProfit = profit;
    }

    Calculator.deposites.sort(function(depA, depB) { return depB.profit - depA.profit; });

    Calculator.minProfit = minProfit || maxProfit;
    Calculator.maxProfit = maxProfit || 0;

    return [minProfit, maxProfit];
  },
  filterByParams: function(deposit) {
    var i, len, names = ['capitalization', 'percentsEndMonth', 'refinance', 'partialWithdraw'];
    for(i = 0, len = names.length; i < len; i++ ) {
      if(this.params[names[i]] && !deposit.params[names[i]]) return false;
    }
    return true;
  },
  getSelectedDeposites: function() {
    return this.deposites.slice(0, 3);
  },
  getStep: function() {
    return this.steps[this.params.currency];
  },
  getMinBound: function() {
    return this.bounds[this.params.currency][0];
  },
  getMaxBound: function() {
    return this.bounds[this.params.currency][1];
  },
  updateSum: function() {
    if(this.params.sum < this.getMinBound()) this.params.sum = this.getMinBound();
    if(this.params.sum > this.getMaxBound()) this.params.sum = this.getMaxBound();
  },
  /**
   * Устанавливает границы диапазона сумм
   */
  setBounds: function() {
    var i, len, deposit;
    var currency, bounds = {};

    for(currency in this.currencies) {
      bounds[currency] = [false, false];
    }

    for (i = 0, len = Calculator.deposites.length; i < len; i++) {
      deposit = Calculator.deposites[i];
      for(currency in this.currencies) {
        if(bounds[currency][0] === false || bounds[currency][0] > deposit.params.minSum[currency]) {
          bounds[currency][0] = deposit.params.minSum[currency];
        }
        if(bounds[currency][1] === false || bounds[currency][1] < deposit.params.maxSum[currency]) {
          bounds[currency][1] = deposit.params.maxSum[currency];
        }
      }
    }
    this.bounds = bounds;
  },
  init: function(defaultParams) {
    // this.setDurations();
    this.params = defaultParams;
    this.currencies = GLOBALS.currencies;
    this.setBounds();
  }
};
