// Customer.cpp: elderly customers get their own numbering (E1, E2...),
// everyone else is numbered after them (Y1, Y2...)
void Customer::setAppointmentNumber(int customersInQueue, int elderCustomersInQueue)
{
    if (customersInQueue == elderCustomersInQueue || customersInQueue == 0) customersInQueue++;
    if (isElderly()) appointmentNumber = "E" + to_string(elderCustomersInQueue);
    else             appointmentNumber = "Y" + to_string(customersInQueue - elderCustomersInQueue);
}

// PostOfficeLogic.cpp: office settings come from a text file (officerCount=, seniorAge=, maxAge=)
if (line.find("officerCount") != string::npos)
{
    officerCount = stoi(line.substr(line.find("=") + 1));
    for (int i = 0; i < officerCount; i++)
    {
        officers.push_back(Officer(i));
        officers[i].maxActions = maxActions;
    }
}
