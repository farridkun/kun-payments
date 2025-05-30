export const CardDummy = (type = 'visa') => {
    const card_number = type === 'visa' ? '4811111111111114' : '5555555555554444';

    return {
        card_number,
        card_cvv: '123',
        card_exp_month: '12',
        card_exp_year: '2030',
    };
}
