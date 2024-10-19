import { LightningElement } from 'lwc';

export default class WorkingTest extends LightningElement {
    hasRendered
    renderedCallback(){
        if(!this.hasRendered){
            this.handleMonthValues(); 
        }       
        this.hasRendered = true;
    }

    testOptions = [
        {
            label: 'Option 1',
            value: 'option1',
            selected: true
        },
        {
            label: 'Option 2',
            value: 'option2',
            selected: true
        },
    ]

    monthYearOptions = [];
    defaultMonths = 3;
    selectedOptions = [];
    handleMonthValues(){
        const options = []
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); //Months are 0-indexed in JS (0 = January)
        const totalMonths = 24; //2 years
    
        for (let i = 0; i < totalMonths; i++) {
            const year = currentYear + Math.floor((currentMonth + i)/12);
            const month = (currentMonth + i) % 12;
    
            const startDate = new Date(year, month, 1); //Start of the month
            const endDate = new Date(year, month + 1, 0); //Last day of the month
    
            const monthLabel = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
            options.push({
                label: monthLabel,           
                value: startDate.toISOString().split('T')[0] + ':' + endDate.toISOString().split('T')[0],
                selected: true
            });
        }
        
        this.selectedOptions = options.slice(0, this.defaultMonths);
        this.monthYearOptions = options;
            console.log('# monthYearOptions = ' + this.monthYearOptions.length);            
    }
}